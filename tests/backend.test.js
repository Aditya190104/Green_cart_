import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { once } from "node:events";
import { openDatabase } from "../server/db.js";
import { createApp } from "../server/app.js";
import { razorpayGateway } from "../server/gateway.js";
const customer = {
  name: "Test Shopper",
  phone: "9876543210",
  email: "shopper@example.com",
  address: "12 Test Street",
  city: "Chandigarh",
  pin: "160017",
};
const body = (payment = "cod") => ({
  items: [{ id: "apple", qty: 2 }],
  customer,
  coupon: "",
  deliverySlot: "Tomorrow, 8 AM – 11 AM",
  payment,
});
async function fixture(t) {
  const db = openDatabase(":memory:");
  let remote = 0;
  const payments = new Map();
  const gateway = {
    enabled: true,
    key: "rzp_test_example",
    secret: "test-only-secret",
    create: async (o) => ({
      id: `order_${++remote}`,
      amount: o.amount,
      currency: "INR",
    }),
    payment: async (id) => payments.get(id),
    payments: async (id) => ({
      items: [...payments.values()].filter((p) => p.order_id === id),
    }),
  };
  const app = createApp({
    db,
    gateway,
    origin: "http://localhost",
    webhookSecret: "test-webhook",
    staticDir: "/nonexistent",
    limit: false,
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((r) => server.close(r));
    db.close();
  });
  function client() {
    let cookie = "";
    return async (path, { method = "GET", body, headers = {}, raw } = {}) => {
      const r = await fetch(base + "/api" + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Green-Cart": "1",
          Origin: "http://localhost",
          ...(cookie ? { Cookie: cookie } : {}),
          ...headers,
        },
        ...(body !== undefined
          ? { body: JSON.stringify(body) }
          : raw
            ? { body: raw }
            : {}),
      });
      if (r.headers.get("set-cookie"))
        cookie = r.headers.get("set-cookie").split(";")[0];
      return { status: r.status, data: await r.json(), headers: r.headers };
    };
  }
  const a = client();
  const signup = await a("/auth/signup", {
    method: "POST",
    body: {
      name: "Shopper",
      email: "one@example.com",
      password: "CorrectHorse123",
    },
  });
  assert.equal(signup.status, 201);
  return { db, gateway, payments, a, client, base };
}
test("auth: hashed password, HttpOnly session, admin guard, CSRF header, logout", async (t) => {
  const { a, db, base } = await fixture(t);
  assert.notEqual(
    db.prepare("SELECT password FROM users").get().password,
    "CorrectHorse123",
  );
  assert.equal((await a("/auth/me")).data.email, "one@example.com");
  assert.equal((await a("/admin/orders")).status, 403);
  assert.equal(
    (await fetch(base + "/api/auth/logout", { method: "POST" })).status,
    403,
  );
  assert.equal(
    (
      await a("/auth/logout", {
        method: "POST",
        body: {},
        headers: { Origin: "https://evil.invalid" },
      })
    ).status,
    403,
  );
  await a("/auth/logout", { method: "POST", body: {} });
  assert.equal((await a("/orders")).status, 401);
  assert.equal(
    (
      await a("/auth/login", {
        method: "POST",
        body: { email: "one@example.com", password: "wrong" },
      })
    ).status,
    401,
  );
  const login = await a("/auth/login", {
    method: "POST",
    body: { email: "one@example.com", password: "CorrectHorse123" },
  });
  assert.equal(login.status, 200);
  assert.match(login.headers.get("set-cookie"), /HttpOnly/);
});
test("server pricing, idempotency and stock transactions resist client changes", async (t) => {
  const { a, db } = await fixture(t);
  const b = { ...body(), total: 1, amount: 1 };
  const first = await a("/orders", {
    method: "POST",
    body: b,
    headers: { "Idempotency-Key": "order-test-1" },
  });
  assert.equal(first.status, 201);
  assert.equal(first.data.total, 333);
  assert.equal(first.data.amount, 33300);
  const again = await a("/orders", {
    method: "POST",
    body: b,
    headers: { "Idempotency-Key": "order-test-1" },
  });
  assert.equal(first.data.id, again.data.id);
  assert.equal(
    db.prepare("SELECT stock FROM products WHERE id=?").get("apple").stock,
    36,
  );
  assert.equal(
    (
      await a("/orders", {
        method: "POST",
        body: { ...b, items: [{ id: "apple", qty: 3 }] },
        headers: { "Idempotency-Key": "order-test-1" },
      })
    ).status,
    409,
  );
  const before = db
    .prepare("SELECT stock FROM products WHERE id=?")
    .get("milk").stock;
  assert.equal(
    (
      await a("/orders", {
        method: "POST",
        body: {
          ...body(),
          items: [
            { id: "milk", qty: 1 },
            { id: "apple", qty: 99 },
          ],
        },
        headers: { "Idempotency-Key": "order-test-2" },
      })
    ).status,
    409,
  );
  assert.equal(
    db.prepare("SELECT stock FROM products WHERE id=?").get("milk").stock,
    before,
  );
  assert.equal(
    (
      await a("/orders", {
        method: "POST",
        body: { ...body(), items: [{ id: "apple", qty: -1 }] },
        headers: { "Idempotency-Key": "order-test-3" },
      })
    ).status,
    400,
  );
});
test("orders and payment endpoints are isolated by signed-in owner", async (t) => {
  const { a, client } = await fixture(t);
  const order = (
    await a("/orders", {
      method: "POST",
      body: body("razorpay"),
      headers: { "Idempotency-Key": "owner-test-1" },
    })
  ).data;
  const b = client();
  await b("/auth/signup", {
    method: "POST",
    body: {
      name: "Other Shopper",
      email: "other@example.com",
      password: "OtherPassword123",
    },
  });
  assert.deepEqual((await b("/orders")).data, []);
  assert.equal(
    (await b(`/orders/${order.id}/payment`, { method: "POST", body: {} }))
      .status,
    404,
  );
  assert.equal(
    (await b(`/orders/${order.id}/reconcile`, { method: "POST", body: {} }))
      .status,
    404,
  );
  assert.equal(
    (
      await b("/payments/verify", {
        method: "POST",
        body: { orderId: order.id },
      })
    ).status,
    404,
  );
});
test("payment verifies signature AND captured status, amount and canonical order", async (t) => {
  const { a, gateway, payments } = await fixture(t);
  const order = (
    await a("/orders", {
      method: "POST",
      body: body("razorpay"),
      headers: { "Idempotency-Key": "payment-test-1" },
    })
  ).data;
  const created = (
    await a(`/orders/${order.id}/payment`, { method: "POST", body: {} })
  ).data;
  const id = "pay_valid123";
  const signature = createHmac("sha256", gateway.secret)
    .update(`${created.order_id}|${id}`)
    .digest("hex");
  const verify = (sig = signature) =>
    a("/payments/verify", {
      method: "POST",
      body: {
        orderId: order.id,
        razorpay_order_id: "ignored-client-id",
        razorpay_payment_id: id,
        razorpay_signature: sig,
      },
    });
  assert.equal((await verify("0".repeat(64))).status, 400);
  payments.set(id, {
    id,
    order_id: created.order_id,
    amount: 33300,
    currency: "INR",
    status: "authorized",
  });
  assert.equal((await verify()).status, 409);
  payments.get(id).status = "captured";
  payments.get(id).amount = 1;
  assert.equal((await verify()).status, 409);
  payments.get(id).amount = 33300;
  payments.get(id).order_id = "order_other";
  assert.equal((await verify()).status, 400);
  payments.get(id).order_id = created.order_id;
  const paid = await verify();
  assert.equal(paid.status, 200);
  assert.equal(paid.data.paymentStatus, "paid");
  assert.equal((await verify()).status, 200);
  assert.equal((await a("/orders")).data[0].paymentStatus, "paid");
});
test("signed webhook and replay handling reconcile pending orders once", async (t) => {
  const { a } = await fixture(t);
  const order = (
    await a("/orders", {
      method: "POST",
      body: body("razorpay"),
      headers: { "Idempotency-Key": "webhook-test-1" },
    })
  ).data;
  const remote = (
    await a(`/orders/${order.id}/payment`, { method: "POST", body: {} })
  ).data;
  const raw = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_webhook",
          order_id: remote.order_id,
          amount: 33300,
          currency: "INR",
          status: "captured",
        },
      },
    },
  });
  const sig = createHmac("sha256", "test-webhook").update(raw).digest("hex");
  assert.equal(
    (
      await a("/payments/webhook", {
        method: "POST",
        raw,
        headers: {
          "x-razorpay-event-id": "evt-1",
          "x-razorpay-signature": "bad",
        },
      })
    ).status,
    400,
  );
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await a("/payments/webhook", {
          method: "POST",
          raw,
          headers: {
            "x-razorpay-event-id": "evt-1",
            "x-razorpay-signature": sig,
          },
        })
      ).status,
      200,
    );
  assert.equal((await a("/orders")).data[0].paymentStatus, "paid");
});
test("admin validation and fulfilment require server role and paid/COD orders", async (t) => {
  const { a, db } = await fixture(t);
  db.prepare(
    "UPDATE users SET role='admin' WHERE email='one@example.com'",
  ).run();
  const p = (await a("/products")).data.find((p) => p.id === "apple");
  assert.equal(
    (
      await a("/admin/products/apple", {
        method: "PUT",
        body: { ...p, stock: -1 },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await a("/admin/products/apple", {
        method: "PUT",
        body: { ...p, stock: 0 },
      })
    ).status,
    200,
  );
  assert.equal(
    (await a("/products")).data.find((p) => p.id === "apple").stock,
    0,
  );
  const o = (
    await a("/orders", {
      method: "POST",
      body: { ...body("razorpay"), items: [{ id: "milk", qty: 1 }] },
      headers: { "Idempotency-Key": "admin-test-1" },
    })
  ).data;
  assert.equal(
    (
      await a(`/admin/orders/${o.id}`, {
        method: "PATCH",
        body: { status: "Delivered" },
      })
    ).status,
    400,
  );
});
test("gateway refuses missing or live keys in this test-only release", () => {
  assert.equal(razorpayGateway({}).enabled, false);
  assert.equal(
    razorpayGateway({
      RAZORPAY_KEY_ID: "rzp_live_example",
      RAZORPAY_KEY_SECRET: "secret",
    }).enabled,
    false,
  );
});
