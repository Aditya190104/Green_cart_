// Smoke-test the actual npm dev command with an isolated temporary database.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
const folder = mkdtempSync(join(tmpdir(), "green-cart-smoke-"));
const child = spawn(process.execPath, ["scripts/dev.mjs"], {
  env: {
    ...process.env,
    DB_PATH: join(folder, "test.sqlite"),
    APP_ORIGIN: "http://127.0.0.1:5173",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
child.stdout.on("data", (b) => (output += b));
child.stderr.on("data", (b) => (output += b));
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch("http://127.0.0.1:5173/api/health");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  assert.ok(ready, "Startup failed: " + output);
  const html = await fetch("http://127.0.0.1:5173/");
  assert.equal(html.status, 200);
  const products = await fetch("http://127.0.0.1:5173/api/products").then((r) =>
    r.json(),
  );
  assert.equal(products.length, 26);
  const image = await fetch("http://127.0.0.1:5173/products/amul-butter.webp");
  assert.equal(image.status, 200);
  console.log(
    "PASS combined Vite + API startup, proxy, 26 seeded products and local asset",
  );
} finally {
  child.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 1000));
  rmSync(folder, { recursive: true, force: true });
}
