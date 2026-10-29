import { createContext, useContext, useEffect, useState } from "react";
import { safeLoad, calculateTotals } from "../lib/shop";
import { PageSkeleton } from "../components/UI";
import { api, payWithRazorpay } from "../lib/api";
const Context = createContext();
function useStored(key, initial) {
  const [value, setValue] = useState(() => safeLoad(key, initial));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}
export function ShopProvider({ children }) {
  const [products, setProductsState] = useState([]),
    [orders, setOrdersState] = useState([]),
    [profile, setProfileState] = useState(null),
    [config, setConfig] = useState({ paymentsEnabled: false, locations: [] }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [cart, setCart] = useStored("gc-cart-v2", {}),
    [wishlist, setWishlist] = useStored("gc-wishlist-v2", []),
    [pin, setPin] = useStored("gc-pin-v2", ""),
    [coupon, setCoupon] = useStored("gc-coupon-v2", "");
  const [toast, setToast] = useState("");
  const notify = setToast;
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  async function reload() {
    const [p, u, c] = await Promise.all([
      api("/products"),
      api("/auth/me"),
      api("/config"),
    ]);
    setProductsState(p);
    setProfileState(u);
    setConfig(c);
    if (u)
      setOrdersState(
        await api(u.role === "admin" ? "/admin/orders" : "/orders"),
      );
    else setOrdersState([]);
  }
  useEffect(() => {
    reload()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ product: products.find((p) => p.id === id), qty }))
    .filter((x) => x.product && x.qty > 0);
  const totals = calculateTotals(lines, coupon);
  const setQuantity = (id, qty) => {
    const p = products.find((p) => p.id === id);
    if (!p) return;
    setCart((old) => {
      const next = { ...old },
        n = Math.max(0, Math.min(99, p.stock, qty));
      if (n) next[id] = n;
      else delete next[id];
      return next;
    });
  };
  const add = (id) => {
    const p = products.find((p) => p.id === id);
    if (!p?.stock) return notify("This product is out of stock.");
    setCart((old) => ({
      ...old,
      [id]: Math.min(99, p.stock, (old[id] || 0) + 1),
    }));
    notify(`${p.name} added to your basket`);
  };
  const toggleWish = (id) =>
    setWishlist((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
    );
  async function authenticate(mode, details) {
    await api(`/auth/${mode}`, { method: "POST", body: details });
    await reload();
  }
  async function logout() {
    await api("/auth/logout", { method: "POST", body: {} });
    setProfileState(null);
    setOrdersState([]);
    setCart({});
    setWishlist([]);
    setCoupon("");
  }
  async function saveProfile(details) {
    const user = await api("/profile", { method: "PATCH", body: details });
    setProfileState(user);
    notify("Profile saved");
  }
  async function saveProduct(product) {
    await api(
      product.id ? `/admin/products/${product.id}` : "/admin/products",
      { method: product.id ? "PUT" : "POST", body: product },
    );
    await reload();
    notify("Product saved");
  }
  async function deleteProduct(id) {
    await api(`/admin/products/${id}`, { method: "DELETE" });
    await reload();
    setCart((old) => {
      const next = { ...old };
      delete next[id];
      return next;
    });
    notify("Product removed");
  }
  async function updateOrder(id, status) {
    await api(`/admin/orders/${id}`, { method: "PATCH", body: { status } });
    await reload();
  }
  async function placeOrder(details) {
    const body = {
      items: lines.map(({ product, qty }) => ({ id: product.id, qty })),
      coupon,
      ...details,
    };
    const fingerprint = JSON.stringify(body);
    let attempt = safeLoad("gc-checkout-attempt-v2", null);
    if (!attempt || attempt.fingerprint !== fingerprint) {
      attempt = { fingerprint, key: crypto.randomUUID() };
      localStorage.setItem("gc-checkout-attempt-v2", JSON.stringify(attempt));
    }
    const order = await api("/orders", {
      method: "POST",
      body,
      headers: { "Idempotency-Key": attempt.key },
    });
    setCart({});
    setCoupon("");
    localStorage.removeItem("gc-checkout-attempt-v2");
    await reload();
    if (order.payment === "razorpay")
      try {
        await payWithRazorpay(order);
        await reload();
      } catch (e) {
        notify(e.message);
      }
    return order.id;
  }
  async function resumePayment(order) {
    try {
      await payWithRazorpay(order);
      await reload();
      notify("Payment verified");
    } catch (e) {
      notify(e.message);
    }
  }
  async function reconcilePayment(id) {
    try {
      const order = await api(`/orders/${id}/reconcile`, {
        method: "POST",
        body: {},
      });
      await reload();
      notify(
        order.paymentStatus === "paid"
          ? "Payment verified"
          : "Payment not yet captured",
      );
    } catch (e) {
      notify(e.message);
    }
  }
  return (
    <Context.Provider
      value={{
        products,
        orders,
        profile,
        config,
        cart,
        lines,
        totals,
        add,
        setQuantity,
        wishlist,
        toggleWish,
        pin,
        setPin,
        coupon,
        setCoupon,
        notify,
        placeOrder,
        authenticate,
        logout,
        saveProfile,
        saveProduct,
        deleteProduct,
        updateOrder,
        resumePayment,
        reconcilePayment,
        reload,
      }}
    >
      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <div className="empty-state">
          <h2>Store connection unavailable</h2>
          <p>{error}</p>
          <button className="button" onClick={() => location.reload()}>
            Retry
          </button>
        </div>
      ) : (
        children
      )}
      <div
        role="status"
        aria-live="polite"
        className={`toast ${toast ? "show" : ""}`}
      >
        {toast}
      </div>
    </Context.Provider>
  );
}
export const useShop = () => useContext(Context);
