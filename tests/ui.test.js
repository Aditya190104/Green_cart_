import { JSDOM, VirtualConsole } from "jsdom";
import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { openDatabase } from "../server/db.js";
import { createApp } from "../server/app.js";
const root = fileURLToPath(new URL("../", import.meta.url));
test("full-stack UI: suggestions, signup, checkout, history, admin and logout", async (t) => {
  const db = openDatabase(":memory:");
  const app = createApp({
    db,
    gateway: { enabled: false },
    origin: "http://localhost",
    limit: false,
    staticDir: "/nonexistent",
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const bundle = await esbuild.build({
    entryPoints: [root + "src/main.jsx"],
    bundle: true,
    write: false,
    format: "iife",
    jsx: "automatic",
    loader: { ".css": "empty" },
    define: {
      "import.meta.env.BASE_URL": '"/"',
      "process.env.NODE_ENV": '"development"',
    },
  });
  const vc = new VirtualConsole(),
    errors = [];
  vc.on("error", (...a) => errors.push(a.join(" ")));
  vc.on("jsdomError", (e) => errors.push(e.message));
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {
    url: "http://localhost/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  t.after(async () => {
    dom.window.close();
    await new Promise((r) => server.close(r));
    db.close();
  });
  const w = dom.window,
    d = w.document;
  w.scrollTo = () => {};
  let cookie = "";
  w.fetch = async (path, options = {}) => {
    const r = await fetch(base + path, {
      ...options,
      headers: {
        ...options.headers,
        Origin: "http://localhost",
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });
    if (r.headers.get("set-cookie"))
      cookie = r.headers.get("set-cookie").split(";")[0];
    return r;
  };
  w.eval(bundle.outputFiles[0].text);
  const wait = () => new Promise((r) => setTimeout(r, 60));
  async function until(fn) {
    for (let i = 0; i < 80; i++) {
      if (fn()) return;
      await wait();
    }
    assert.ok(fn(), "Timed out waiting for UI state");
  }
  function click(el) {
    assert.ok(el, "click target exists");
    el.click();
  }
  const btn = (text) =>
    [...d.querySelectorAll("button")].find((x) => x.textContent.includes(text));
  async function route(path) {
    w.location.hash = "#" + path;
    await until(
      () => d.querySelector("main")?.dataset.route === path.split("?")[0],
    );
    await wait();
  }
  function input(el, value) {
    assert.ok(el);
    Object.getOwnPropertyDescriptor(
      w.HTMLInputElement.prototype,
      "value",
    ).set.call(el, value);
    el.dispatchEvent(new w.Event("input", { bubbles: true }));
    el.dispatchEvent(new w.Event("change", { bubbles: true }));
  }
  function fill(label, value) {
    const l = [...d.querySelectorAll("label")].find((x) =>
      x.textContent.trim().startsWith(label),
    );
    assert.ok(l, label);
    input(l.querySelector("input"), value);
  }
  function submit(selector) {
    d.querySelector(selector).dispatchEvent(
      new w.Event("submit", { bubbles: true, cancelable: true }),
    );
  }
  await until(() => d.querySelector(".hero"));
  assert.equal(d.querySelectorAll(".product-rail .product-card").length, 10);
  console.log("PASS branded product rail");
  const search = d.querySelector('[aria-label="Search groceries"]');
  input(search, "namak");
  await wait();
  assert.match(
    d.querySelector("[role=listbox]").textContent,
    /Tata Iodised Salt/,
  );
  input(search, "magg");
  await wait();
  assert.match(d.querySelector("[role=listbox]").textContent, /Maggi/);
  click(d.querySelector("[role=option]"));
  await until(() => /Maggi/.test(d.querySelector("h1")?.textContent || ""));
  assert.match(d.querySelector("h1").textContent, /Maggi/);
  console.log("PASS synonyms and product suggestions");
  d.querySelector(".location-button").focus();
  click(d.querySelector(".location-button"));
  await wait();
  assert.equal(d.querySelectorAll(".location-list button").length, 8);
  input(d.querySelector('.location-search input'), "Delhi");
  await wait();
  assert.equal(d.querySelectorAll(".location-list button").length, 2);
  const dialogButtons = d.querySelectorAll('[role=dialog] button');
  dialogButtons[dialogButtons.length - 1].focus();
  d.activeElement.dispatchEvent(new w.KeyboardEvent("keydown", {key: "Tab", bubbles: true}));
  assert.equal(d.activeElement.getAttribute("aria-label"), "Close location selector");
  input(d.querySelector('.location-search input'), "");
  await wait();
  click(d.querySelector(".location-list button"));
  await wait();
  assert.equal(JSON.parse(w.localStorage.getItem("gc-pin-v2")), "160017");
  assert.equal(d.activeElement, d.querySelector(".location-button"));
  assert.equal(d.body.style.overflow, "");
  console.log("PASS searchable location selector and focus restoration");
  await route("/shop?brand=Amul");
  await until(() => d.querySelector("#brand-filter"));
  assert.equal(d.querySelectorAll(".catalog-grid .product-card").length, 2);
  click(d.querySelector('[aria-label="Remove filter Amul"]'));
  await until(() => d.querySelectorAll(".catalog-grid .product-card").length === 26);
  console.log("PASS brand filters and removable filter chips");
  await route("/product/apple");
  click(btn("Add to basket"));
  await wait();
  await route("/cart");
  assert.match(d.body.textContent, /Crisp Red Apples/);
  await route("/checkout");
  assert.match(d.body.textContent, /Sign in to checkout/);
  await route("/login");
  click(btn("Create an account"));
  await wait();
  fill("Your name", "Test Shopper");
  fill("Email address", "ui@example.com");
  fill("Password", "UiPassword12345");
  await wait();
  submit(".auth-form form");
  await until(() => d.body.textContent.includes("Your orders"));
  console.log("PASS real signup and signed-in dashboard");
  await route("/checkout");
  fill("Mobile number", "9876543210");
  fill("City", "Chandigarh");
  fill("House / flat", "12 Test Road");
  fill("PIN code", "160017");
  await wait();
  assert.equal(d.querySelectorAll("form form").length, 0);
  assert.ok(d.querySelector("input[name=payment][disabled]"));
  submit("form.checkout-grid");
  await until(() => d.body.textContent.includes("Thanks for your order!"));
  const order = db.prepare("SELECT * FROM orders").get();
  assert.equal(order.payment_status, "cod");
  assert.equal(JSON.parse(order.data).total, 184);
  assert.equal(
    db.prepare("SELECT stock FROM products WHERE id='apple'").get().stock,
    37,
  );
  console.log("PASS server checkout, totals, inventory and confirmation");
  await route("/account");
  assert.match(d.body.textContent, new RegExp(order.id));
  await route("/admin");
  assert.match(d.body.textContent, /administrator account/);
  console.log("PASS customer access guard and server order history");
  db.prepare(
    "UPDATE users SET role='admin' WHERE email='ui@example.com'",
  ).run();
  await route("/account");
  click(btn("Sign out"));
  await until(() => d.querySelector(".hero"));
  await route("/login");
  fill("Email address", "ui@example.com");
  fill("Password", "UiPassword12345");
  await wait();
  submit(".auth-form form");
  await until(() => d.body.textContent.includes("Store administration"));
  await route("/admin");
  click(d.querySelector('[aria-label="Edit Crisp Red Apples"]'));
  await wait();
  fill("Stock (packs)", "0");
  await wait();
  submit(".admin-modal form");
  await until(() => !d.querySelector(".admin-modal"));
  assert.equal(
    db.prepare("SELECT stock FROM products WHERE id='apple'").get().stock,
    0,
  );
  await route("/product/apple");
  assert.ok(btn("Out of stock").disabled);
  console.log("PASS server-backed admin stock editing");
  await route("/account");
  click(btn("Sign out"));
  await until(() => d.querySelector(".hero"));
  await route("/account");
  assert.match(d.body.textContent, /Sign in to view your orders/);
  assert.equal(db.prepare("SELECT count(*) as n FROM sessions").get().n, 0);
  assert.deepEqual(errors, []);
  console.log("PASS session revocation and no React runtime warnings");
});
