import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { openDatabase } from "../server/db.js";
import { hashPassword } from "../server/security.js";
let muted = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding);
    callback();
  },
});
const rl = createInterface({
  input: process.stdin,
  output,
  terminal: !!process.stdin.isTTY,
});
let db;
try {
  const email = (await rl.question("Admin email: ")).trim().toLowerCase();
  const name = (await rl.question("Admin name: ")).trim();
  process.stdout.write(
    "New admin password (12+ characters; hidden while typing): ",
  );
  muted = true;
  const password = await rl.question("");
  muted = false;
  process.stdout.write("\n");
  if (
    !/^\S+@\S+\.\S+$/.test(email) ||
    email.length > 160 ||
    name.length < 2 ||
    name.length > 80 ||
    password.length < 12 ||
    password.length > 128
  )
    throw Error("Use a valid email, name and 12–128 character password.");
  db = openDatabase(
    resolve(process.env.DB_PATH || "server/data/green-cart.sqlite"),
  );
  if (db.prepare("SELECT 1 FROM users WHERE email=?").get(email))
    throw Error("Email already exists. Use a separate admin email.");
  db.prepare(
    "INSERT INTO users(id,email,password,name,role) VALUES(?,?,?,?,'admin')",
  ).run(randomUUID(), email, await hashPassword(password), name);
  console.log("Admin created. Sign in through the storefront.");
} catch (error) {
  muted = false;
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rl.close();
  db?.close();
}
