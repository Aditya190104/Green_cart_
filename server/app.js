import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { productFromRow, orderFromRow, transaction } from "./db.js";
import {
  hashPassword,
  checkPassword,
  hashToken,
  validSignature,
  fail,
  text,
} from "./security.js";
import {
  calculateTotals,
  availablePin,
  validProduct,
} from "../src/lib/shop.js";
import { categories } from "../src/data/products.js";
export function createApp({
  db,
  gateway,
  origin = "http://127.0.0.1:5173",
  production = false,
  webhookSecret = "",
  staticDir = resolve("dist"),
  limit = true,
}) {
  const paymentCreations = new Map();
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ contentSecurityPolicy: false }));
  const publicUser = (row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    ...JSON.parse(row.details),
  });
  const products = () =>
    db
      .prepare("SELECT * FROM products WHERE active=1")
      .all()
      .map(productFromRow);
  const orderById = (id) =>
    db.prepare("SELECT * FROM orders WHERE id=?").get(id);
  function setPaid(row, payment) {
    if (!row || row.gateway_order !== payment.order_id)
      fail(400, "Payment order does not match");
    const data = JSON.parse(row.data);
    if (
      payment.status !== "captured" ||
      payment.currency !== "INR" ||
      payment.amount !== data.amount
    )
      fail(409, "Payment is not captured for the exact order amount");
    transaction(db, () => {
      const current = orderById(row.id);
      if (current.payment_status === "paid") {
        if (current.payment_id !== payment.id)
          fail(409, "Order already paid by another payment");
        return;
      }
      db.prepare(
        "UPDATE orders SET payment_status='paid',status='Confirmed',payment_id=? WHERE id=?",
      ).run(payment.id, row.id);
    });
    return orderFromRow(orderById(row.id));
  }
  app.post(
    "/api/payments/webhook",
    express.raw({ type: "application/json", limit: "128kb" }),
    (req, res, next) => {
      try {
        if (
          !validSignature(
            req.body,
            req.get("x-razorpay-signature"),
            webhookSecret,
          )
        )
          fail(400, "Invalid webhook signature");
        const event = JSON.parse(req.body.toString());
        const id = req.get("x-razorpay-event-id");
        if (!text(id, 1, 200)) fail(400, "Missing event ID");
        if (db.prepare("SELECT 1 FROM events WHERE id=?").get(id))
          return res.json({ received: true });
        if (event.event === "payment.captured") {
          const p = event.payload?.payment?.entity;
          const row = db
            .prepare("SELECT * FROM orders WHERE gateway_order=?")
            .get(p?.order_id || "");
          if (!row) fail(409, "Order not yet linked; retry event");
          setPaid(row, p);
        }
        db.prepare("INSERT OR IGNORE INTO events VALUES(?,?)").run(
          id,
          Date.now(),
        );
        res.json({ received: true });
      } catch (e) {
        next(e);
      }
    },
  );
  app.use(express.json({ limit: "128kb" }));
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.get("Origin") && req.get("Origin") !== origin)
        return res.status(403).json({ error: "Origin not allowed" });
      if (req.get("X-Green-Cart") !== "1")
        return res
          .status(403)
          .json({ error: "Missing same-origin request header" });
    }
    next();
  });
  if (limit)
    app.use(
      "/api",
      rateLimit({
        windowMs: 60000,
        limit: 180,
        standardHeaders: "draft-7",
        legacyHeaders: false,
      }),
    );
  app.use((req, res, next) => {
    const cookie = (req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("gc_session="));
    const token = cookie?.slice(11);
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      const session = db
        .prepare(
          "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>?",
        )
        .get(hashToken(token), Date.now());
      if (session) {
        req.user = publicUser(session);
        req.session = hashToken(token);
      }
    }
    next();
  });
  const auth = (req, res, next) =>
    req.user
      ? next()
      : res.status(401).json({ error: "Please sign in to continue." });
  const admin = (req, res, next) =>
    req.user?.role === "admin"
      ? next()
      : res.status(403).json({ error: "Administrator access required." });
  const session = (res, user) => {
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
      hashToken(token),
      user.id,
      Date.now() + 7 * 86400000,
    );
    res.cookie("gc_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: production,
      maxAge: 7 * 86400000,
      path: "/",
    });
    return publicUser(user);
  };
  const authLimiter = limit
    ? rateLimit({
        windowMs: 15 * 60000,
        limit: 20,
        standardHeaders: "draft-7",
        legacyHeaders: false,
      })
    : (req, res, next) => next();
  app.get("/api/health", (req, res) => res.json({ ok: true }));
  app.get("/api/config", (req, res) =>
    res.json({
      paymentsEnabled: gateway.enabled,
      paymentMode: "test",
      locations: [
        { city: "Chandigarh", pin: "160017" },
        { city: "Mohali", pin: "140301" },
        { city: "Ludhiana", pin: "141001" },
        { city: "New Delhi", pin: "110001" },
        { city: "Chandigarh Sector 22", pin: "160022" },
        { city: "Mohali Phase 7", pin: "160062" },
        { city: "Ludhiana Model Town", pin: "141002" },
        { city: "Delhi Karol Bagh", pin: "110005" },
      ],
    }),
  );
  app.get("/api/products", (req, res) => res.json(products()));
  app.get("/api/auth/me", (req, res) => res.json(req.user || null));
  app.post("/api/auth/signup", authLimiter, async (req, res) => {
    const { email, password, name } = req.body;
    const normalized =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    if (
      !text(name, 2, 80) ||
      !/^\S+@\S+\.\S+$/.test(normalized) ||
      normalized.length > 160 ||
      !text(password, 10, 128)
    )
      fail(400, "Use a valid name, email and a password of 10–128 characters.");
    if (db.prepare("SELECT 1 FROM users WHERE email=?").get(normalized))
      fail(409, "An account with this email already exists.");
    const user = {
      id: randomUUID(),
      email: normalized,
      name: name.trim(),
      password: await hashPassword(password),
    };
    try {
      db.prepare(
        "INSERT INTO users(id,email,name,password) VALUES(?,?,?,?)",
      ).run(user.id, user.email, user.name, user.password);
    } catch {
      fail(409, "Account could not be created. Try signing in.");
    }
    res
      .status(201)
      .json(
        session(res, db.prepare("SELECT * FROM users WHERE id=?").get(user.id)),
      );
  });
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!text(email, 3, 160) || !text(password, 1, 128))
      fail(400, "Email and password required");
    const user = db
      .prepare("SELECT * FROM users WHERE email=?")
      .get(email.trim().toLowerCase());
    if (!user || !(await checkPassword(password, user.password)))
      fail(401, "Incorrect email or password");
    if (req.session)
      db.prepare("DELETE FROM sessions WHERE hash=?").run(req.session);
    res.json(session(res, user));
  });
  app.post("/api/auth/logout", (req, res) => {
    if (req.session)
      db.prepare("DELETE FROM sessions WHERE hash=?").run(req.session);
    res.clearCookie("gc_session", { path: "/" });
    res.json({ ok: true });
  });
  app.patch("/api/profile", auth, (req, res) => {
    const { name, phone = "", address = "", city = "", pin = "" } = req.body;
    if (
      !text(name, 2, 80) ||
      !text(address, 0, 300) ||
      !text(city, 0, 80) ||
      !text(phone, 0, 10) ||
      !text(pin, 0, 6) ||
      (phone && !/^[6-9]\d{9}$/.test(phone)) ||
      (pin && !/^\d{6}$/.test(pin))
    )
      fail(400, "Invalid profile details");
    db.prepare("UPDATE users SET name=?,details=? WHERE id=?").run(
      name.trim(),
      JSON.stringify({ phone, address, city, pin }),
      req.user.id,
    );
    res.json(
      publicUser(db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id)),
    );
  });
  app.get("/api/orders", auth, (req, res) =>
    res.json(
      db
        .prepare("SELECT * FROM orders WHERE user_id=? ORDER BY created DESC")
        .all(req.user.id)
        .map(orderFromRow),
    ),
  );
  app.get("/api/admin/orders", auth, admin, (req, res) =>
    res.json(
      db
        .prepare("SELECT * FROM orders ORDER BY created DESC")
        .all()
        .map(orderFromRow),
    ),
  );
  function validatedProduct(body, id) {
    const p = {
      id,
      name: body.name,
      category: body.category,
      unit: body.unit,
      price: body.price,
      mrp: body.mrp,
      stock: body.stock,
      image: body.image,
      badge: body.badge || "Fresh pick",
      description: body.description,
      storage: body.storage || "Follow storage instructions on the pack.",
      rating: 0,
      reviews: 0,
    };
    if (
      !text(p.name, 2, 120) ||
      !validProduct(p) ||
      p.price > 100000 ||
      p.stock > 100000 ||
      !categories.some((c) => c.id === p.category) ||
      !text(p.unit, 1, 60) ||
      !text(p.description, 1, 1000) ||
      !text(p.badge, 1, 40) ||
      !text(p.storage, 1, 500) ||
      !/^products\/[a-z0-9-]+\.webp$/.test(p.image) ||
      !existsSync(resolve("public", p.image))
    )
      fail(400, "Invalid product fields or local image");
    p.price = Math.round(p.price * 100) / 100;
    p.mrp = Math.round(p.mrp * 100) / 100;
    return p;
  }
  app.post("/api/admin/products", auth, admin, (req, res) => {
    const p = validatedProduct(req.body, `custom-${randomUUID()}`);
    db.prepare("INSERT INTO products(id,data,stock) VALUES(?,?,?)").run(
      p.id,
      JSON.stringify(p),
      p.stock,
    );
    res.status(201).json(p);
  });
  app.put("/api/admin/products/:id", auth, admin, (req, res) => {
    const old = db
      .prepare("SELECT * FROM products WHERE id=? AND active=1")
      .get(req.params.id);
    if (!old) fail(404, "Product not found");
    const validated = validatedProduct(req.body, old.id);
    const previous = JSON.parse(old.data);
    const p = {
      ...previous,
      ...validated,
      rating: previous.rating,
      reviews: previous.reviews,
    };
    db.prepare("UPDATE products SET data=?,stock=? WHERE id=?").run(
      JSON.stringify(p),
      p.stock,
      p.id,
    );
    res.json(p);
  });
  app.delete("/api/admin/products/:id", auth, admin, (req, res) => {
    db.prepare("UPDATE products SET active=0 WHERE id=?").run(req.params.id);
    res.json({ ok: true });
  });
  app.patch("/api/admin/orders/:id", auth, admin, (req, res) => {
    const row = orderById(req.params.id);
    if (!row) fail(404, "Order not found");
    const stages = ["Confirmed", "Packing", "Out for delivery", "Delivered"];
    if (
      !stages.includes(req.body.status) ||
      !["paid", "cod"].includes(row.payment_status)
    )
      fail(
        400,
        "Only confirmed COD or captured-payment orders can be fulfilled",
      );
    if (stages.indexOf(req.body.status) < stages.indexOf(row.status))
      fail(400, "Order status cannot move backwards");
    db.prepare("UPDATE orders SET status=? WHERE id=?").run(
      req.body.status,
      row.id,
    );
    res.json(orderFromRow(orderById(row.id)));
  });
  function draftOrder(req) {
    const { items, customer, coupon = "", deliverySlot, payment } = req.body;
    if (
      !Array.isArray(items) ||
      items.length < 1 ||
      items.length > 60 ||
      !customer ||
      !["cod", "razorpay"].includes(payment) ||
      ![
        "Tomorrow, 8 AM – 11 AM",
        "Tomorrow, 4 PM – 7 PM",
        "Day after tomorrow, 8 AM – 11 AM",
      ].includes(deliverySlot)
    )
      fail(400, "Invalid checkout request");
    if (
      !text(customer.name, 2, 80) ||
      !text(customer.address, 8, 300) ||
      !text(customer.city, 2, 80) ||
      !text(customer.email, 3, 160) ||
      !/^\S+@\S+\.\S+$/.test(customer.email) ||
      !text(customer.phone, 10, 10) ||
      !/^[6-9]\d{9}$/.test(customer.phone) ||
      !availablePin(customer.pin)
    )
      fail(400, "Check delivery details and supported PIN code");
    if (!["", "FRESH10"].includes(coupon)) fail(400, "Unknown coupon");
    const unique = new Set();
    const lines = items.map((item) => {
      if (
        !text(item.id, 1, 100) ||
        unique.has(item.id) ||
        !Number.isInteger(item.qty) ||
        item.qty < 1 ||
        item.qty > 99
      )
        fail(400, "Invalid item quantity or duplicate item");
      unique.add(item.id);
      const p = productFromRow(
        db
          .prepare("SELECT * FROM products WHERE id=? AND active=1")
          .get(item.id),
      );
      if (!p || p.stock < item.qty)
        fail(409, "Stock has changed. Refresh your basket.");
      return { product: p, qty: item.qty };
    });
    const totals = calculateTotals(lines, coupon);
    return {
      id: `GC-${randomUUID()}`,
      date: new Date().toISOString(),
      items: lines,
      customer: {
        name: customer.name,
        address: customer.address,
        city: customer.city,
        pin: customer.pin,
        phone: customer.phone,
        email: customer.email,
      },
      deliverySlot,
      payment,
      ...totals,
      amount: Math.round(totals.total * 100),
    };
  }
  app.post("/api/orders", auth, async (req, res) => {
    const key = req.get("Idempotency-Key");
    if (!text(key, 8, 100)) fail(400, "Idempotency key required");
    const requestHash = createHash("sha256")
      .update(JSON.stringify(req.body))
      .digest("hex");
    let row = db
      .prepare("SELECT * FROM orders WHERE user_id=? AND request_key=?")
      .get(req.user.id, key);
    if (row && row.request_hash !== requestHash)
      fail(409, "Request key already used for a different basket");
    if (!row) {
      if (req.body.payment === "razorpay" && !gateway.enabled)
        fail(503, "Configure Razorpay test keys before online checkout.");
      row = transaction(db, () => {
        const order = draftOrder(req);
        const status =
          order.payment === "cod" ? "Confirmed" : "Awaiting payment";
        const paymentStatus = order.payment === "cod" ? "cod" : "pending";
        for (const { product, qty } of order.items) {
          const changed = db
            .prepare(
              "UPDATE products SET stock=stock-? WHERE id=? AND stock>=?",
            )
            .run(qty, product.id, qty);
          if (changed.changes !== 1) fail(409, "Insufficient stock");
        }
        db.prepare(
          "INSERT INTO orders(id,user_id,request_key,request_hash,data,status,payment_status,created) VALUES(?,?,?,?,?,?,?,?)",
        ).run(
          order.id,
          req.user.id,
          key,
          requestHash,
          JSON.stringify(order),
          status,
          paymentStatus,
          Date.now(),
        );
        return orderById(order.id);
      });
    }
    res.status(201).json(orderFromRow(row));
  });
  app.post("/api/orders/:id/payment", auth, async (req, res) => {
    let row = orderById(req.params.id);
    if (!row || row.user_id !== req.user.id) fail(404, "Order not found");
    if (row.payment_status !== "pending")
      fail(409, "Order does not require an online payment");
    if (!gateway.enabled) fail(503, "Payment provider not configured");
    if (!row.gateway_order) {
      let creation = paymentCreations.get(row.id);
      if (!creation) {
        creation = gateway.create(JSON.parse(row.data));
        paymentCreations.set(row.id, creation);
      }
      let remote;
      try {
        remote = await creation;
      } finally {
        paymentCreations.delete(row.id);
      }
      if (
        !text(remote.id, 1, 100) ||
        remote.amount !== JSON.parse(row.data).amount ||
        remote.currency !== "INR"
      )
        fail(502, "Invalid payment order response");
      db.prepare(
        "UPDATE orders SET gateway_order=? WHERE id=? AND gateway_order IS NULL",
      ).run(remote.id, row.id);
      row = orderById(row.id);
    }
    res.json({
      key: gateway.key,
      order_id: row.gateway_order,
      amount: JSON.parse(row.data).amount,
      currency: "INR",
      mode: "test",
    });
  });
  app.post("/api/payments/verify", auth, async (req, res) => {
    const { orderId, razorpay_payment_id, razorpay_signature } = req.body;
    const row = orderById(typeof orderId === "string" ? orderId : "");
    if (!row || row.user_id !== req.user.id) fail(404, "Order not found");
    if (
      !row.gateway_order ||
      !/^pay_[A-Za-z0-9]+$/.test(razorpay_payment_id || "") ||
      !validSignature(
        `${row.gateway_order}|${razorpay_payment_id}`,
        razorpay_signature,
        gateway.secret,
      )
    )
      fail(400, "Payment signature verification failed");
    const p = await gateway.payment(razorpay_payment_id);
    if (p.id !== razorpay_payment_id) fail(400, "Payment ID mismatch");
    res.json(setPaid(row, p));
  });
  app.post("/api/orders/:id/reconcile", auth, async (req, res) => {
    const row = orderById(req.params.id);
    if (!row || row.user_id !== req.user.id) fail(404, "Order not found");
    if (!row.gateway_order) return res.json(orderFromRow(row));
    const result = await gateway.payments(row.gateway_order);
    const paid = result.items?.find((p) => p.status === "captured");
    res.json(paid ? setPaid(row, paid) : orderFromRow(row));
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "API route not found" }),
  );
  if (existsSync(staticDir)) app.use(express.static(staticDir));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    res
      .status(error.status || 500)
      .json({
        error: error.status ? error.message : "Server error. Please retry.",
      });
  });
  return app;
}
