import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { initialProducts } from "../src/data/products.js";
export function openDatabase(filename) {
  if (filename !== ":memory:")
    mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'customer',details TEXT NOT NULL DEFAULT '{}');
CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,data TEXT NOT NULL,stock INTEGER NOT NULL CHECK(stock>=0),active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),request_key TEXT NOT NULL,request_hash TEXT NOT NULL,data TEXT NOT NULL,status TEXT NOT NULL,payment_status TEXT NOT NULL,gateway_order TEXT UNIQUE,payment_id TEXT UNIQUE,created INTEGER NOT NULL,UNIQUE(user_id,request_key));
CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
  if (!db.prepare("SELECT 1 FROM settings WHERE key='seed-v2'").get()) {
    const put = db.prepare(
      "INSERT OR IGNORE INTO products(id,data,stock) VALUES(?,?,?)",
    );
    db.exec("BEGIN");
    try {
      for (const p of initialProducts)
        put.run(p.id, JSON.stringify(p), p.stock);
      db.prepare("INSERT INTO settings VALUES('seed-v2','done')").run();
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  return db;
}
export function transaction(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
export const productFromRow = (row) =>
  row ? { ...JSON.parse(row.data), stock: row.stock } : null;
export const orderFromRow = (row) =>
  row
    ? {
        ...JSON.parse(row.data),
        status: row.status,
        paymentStatus: row.payment_status,
      }
    : null;
