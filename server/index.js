import "dotenv/config";
import { resolve } from "node:path";
import { openDatabase } from "./db.js";
import { createApp } from "./app.js";
import { razorpayGateway } from "./gateway.js";
const port = Number(process.env.API_PORT || 3001);
const db = openDatabase(
  resolve(process.env.DB_PATH || "server/data/green-cart.sqlite"),
);
const app = createApp({
  db,
  gateway: razorpayGateway(),
  origin: process.env.APP_ORIGIN || "http://127.0.0.1:5173",
  production: process.env.NODE_ENV === "production",
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
});
const server = app.listen(port, process.env.API_HOST || "127.0.0.1", () =>
  console.log(`Green Cart API: http://127.0.0.1:${port}`),
);
function stop() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
