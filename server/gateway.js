import { HttpError } from "./security.js";
export function razorpayGateway(env = process.env) {
  const key = env.RAZORPAY_KEY_ID || "",
    secret = env.RAZORPAY_KEY_SECRET || "";
  const enabled = key.startsWith("rzp_test_") && secret.length > 0;
  async function call(path, body) {
    if (!enabled)
      throw new HttpError(
        503,
        "Razorpay Test Mode is not configured. Use cash on delivery or configure server keys.",
      );
    let res;
    try {
      res = await fetch(`https://api.razorpay.com/v1/${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new HttpError(
        503,
        "Payment provider is unavailable. Your order remains pending.",
      );
    }
    if (!res.ok)
      throw new HttpError(
        502,
        "Payment provider rejected the request. Check server configuration.",
      );
    return res.json();
  }
  return {
    enabled,
    key,
    secret,
    mode: "test",
    create: (order) =>
      call("orders", {
        amount: order.amount,
        currency: "INR",
        receipt: order.id,
        partial_payment: false,
      }),
    payment: (id) => call(`payments/${encodeURIComponent(id)}`),
    payments: (id) => call(`orders/${encodeURIComponent(id)}/payments`),
  };
}
