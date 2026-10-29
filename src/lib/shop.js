export const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
export const discount = (p) =>
  Math.max(0, Math.round((1 - p.price / p.mrp) * 100));
export const availablePin = (pin) => /^(110|140|141|160)\d{3}$/.test(pin);
export function calculateTotals(lines, coupon = "") {
  const subtotal =
    lines.reduce(
      (sum, { product, qty }) => sum + Math.round(product.price * 100) * qty,
      0,
    ) / 100;
  const mrp =
    lines.reduce(
      (sum, { product, qty }) => sum + Math.round(product.mrp * 100) * qty,
      0,
    ) / 100;
  const couponDiscount =
    coupon === "FRESH10" && subtotal >= 499
      ? Math.min(100, Math.round(subtotal * 0.1))
      : 0;
  const delivery = subtotal === 0 || subtotal >= 499 ? 0 : 35;
  return {
    subtotal,
    mrp,
    couponDiscount,
    delivery,
    total: Math.round((subtotal - couponDiscount + delivery) * 100) / 100,
    savings: Math.round((mrp - subtotal + couponDiscount) * 100) / 100,
  };
}
export function safeLoad(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}
export function validProduct(p) {
  return (
    typeof p.name === "string" &&
    p.name.trim().length > 1 &&
    Number.isFinite(p.price) &&
    p.price > 0 &&
    Number.isFinite(p.mrp) &&
    p.mrp >= p.price &&
    Number.isInteger(p.stock) &&
    p.stock >= 0
  );
}
