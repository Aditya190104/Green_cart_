export async function api(path, { method = "GET", body, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-Green-Cart": "1",
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw Error("Cannot reach the store server. Run npm run dev and retry.");
  }
  const data = await response
    .json()
    .catch(() => ({ error: "Unexpected server response" }));
  if (!response.ok) throw Error(data.error || "Request failed");
  return data;
}
let scriptPromise;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise)
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = resolve;
      script.onerror = () => {
        scriptPromise = null;
        script.remove();
        reject(Error("Could not load secure checkout. Retry from My orders."));
      };
      document.head.appendChild(script);
    });
  return scriptPromise;
}
export async function payWithRazorpay(order) {
  await loadCheckout();
  const payment = await api(`/orders/${order.id}/payment`, {
    method: "POST",
    body: {},
  });
  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      ...payment,
      name: "Green Cart",
      description: `Order ${order.id}`,
      prefill: {
        name: order.customer.name,
        email: order.customer.email,
        contact: order.customer.phone,
      },
      theme: { color: "#174b35" },
      handler: async (result) => {
        try {
          resolve(
            await api("/payments/verify", {
              method: "POST",
              body: { orderId: order.id, ...result },
            }),
          );
        } catch (e) {
          reject(e);
        }
      },
      modal: {
        ondismiss: () =>
          reject(
            Error(
              "Checkout closed. Your order is pending; retry or check payment from My orders.",
            ),
          ),
      },
    });
    checkout.on("payment.failed", () =>
      reject(Error("Payment failed. Retry from My orders.")),
    );
    checkout.open();
  });
}
