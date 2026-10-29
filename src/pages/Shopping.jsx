import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Trash2,
  ArrowRight,
  Tag,
  ShieldCheck,
  Check,
  PackageCheck,
  Truck,
} from "lucide-react";
import { useShop } from "../context/ShopContext";
import { money, availablePin } from "../lib/shop";
import { Empty, PageHeading, ProductImage, Quantity } from "../components/UI";
export function Summary({ children }) {
  const { totals, lines, coupon, setCoupon, notify } = useShop();
  const [code, setCode] = useState(coupon);
  return (
    <aside className="order-summary">
      <h3>Your basket summary</h3>
      <div className="summary-lines">
        <p>
          <span>Subtotal ({lines.reduce((n, x) => n + x.qty, 0)} items)</span>
          <strong>{money(totals.subtotal)}</strong>
        </p>
        <p>
          <span>Delivery</span>
          <strong className="green">
            {totals.delivery ? money(totals.delivery) : "FREE"}
          </strong>
        </p>
        {totals.couponDiscount > 0 && (
          <p>
            <span>FRESH10 savings</span>
            <strong className="green">−{money(totals.couponDiscount)}</strong>
          </p>
        )}
      </div>
      <div className="coupon-form">
        <Tag size={16} />
        <label className="sr-only" htmlFor="coupon">
          Coupon code
        </label>
        <input
          id="coupon"
          value={code}
          placeholder="Have a coupon?"
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            if (code.trim().toUpperCase() !== "FRESH10") {
              notify("Use FRESH10 for 10% off orders of ₹499+.");
              return;
            }
            if (totals.subtotal < 499) {
              notify("Add items to reach ₹499 before applying FRESH10.");
              return;
            }
            setCoupon("FRESH10");
            notify("FRESH10 applied — enjoy your savings!");
          }}
        >
          Apply
        </button>
      </div>
      {coupon && (
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setCoupon("");
            setCode("");
          }}
        >
          Remove coupon
        </button>
      )}
      <div className="summary-total">
        <span>Total</span>
        <strong>{money(totals.total)}</strong>
      </div>
      <p className="savings">
        <Check size={16} />
        You’re saving {money(totals.savings)} on this order
      </p>
      {children}
      <small className="summary-note">
        <ShieldCheck size={14} />
        Online payments verified on the server · Test Mode
      </small>
    </aside>
  );
}
export function Cart() {
  const { lines, setQuantity, totals } = useShop();
  return (
    <div className="container page">
      <PageHeading
        title="A basket full of good things"
        description="Fresh picks, everyday favourites, and a little happiness."
      />
      {!lines.length ? (
        <Empty
          title="Your basket is waiting"
          description="Let’s fill it with something fresh."
        />
      ) : (
        <div className="checkout-grid">
          <div>
            <div className="delivery-progress">
              <Truck size={21} />
              <div>
                <strong>
                  {totals.subtotal >= 499
                    ? "You’ve unlocked free delivery!"
                    : `You’re ${money(499 - totals.subtotal)} away from free delivery`}
                </strong>
                <div className="progress-track">
                  <span
                    style={{
                      width: `${Math.min(100, (totals.subtotal / 499) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="cart-items">
              {lines.map(({ product: p, qty }) => (
                <article key={p.id} className="cart-item">
                  <Link to={`/product/${p.id}`}>
                    <ProductImage product={p} />
                  </Link>
                  <div>
                    <Link className="product-name" to={`/product/${p.id}`}>
                      {p.name}
                    </Link>
                    <p className="unit">{p.unit}</p>
                    <strong>{money(p.price)}</strong> <del>{money(p.mrp)}</del>
                    {qty > p.stock && (
                      <p className="error">
                        Only {p.stock} available. Reduce quantity.
                      </p>
                    )}
                  </div>
                  <Quantity product={p} qty={qty} />
                  <strong>{money(p.price * qty)}</strong>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${p.name} from cart`}
                    onClick={() => setQuantity(p.id, 0)}
                  >
                    <Trash2 size={18} />
                  </button>
                </article>
              ))}
            </div>
            <Link className="text-link continue-shopping" to="/shop">
              Continue shopping <ArrowRight size={16} />
            </Link>
          </div>
          <Summary>
            <Link className="button full" to="/checkout">
              Proceed to checkout <ArrowRight size={18} />
            </Link>
          </Summary>
        </div>
      )}
    </div>
  );
}
export function Checkout() {
  const { lines, profile, pin, setPin, placeOrder, config } = useShop();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: profile?.name || "",
    phone: profile?.phone || "",
    email: profile?.email || "",
    address: profile?.address || "",
    city: profile?.city || "",
    pin: pin || profile?.pin || "",
    slot: "Tomorrow, 8 AM – 11 AM",
    payment: "cod",
  });
  const field = (key, label, props = {}) => (
    <label>
      {label}
      <input
        required
        {...props}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );
  if (!profile)
    return (
      <Empty
        title="Sign in to checkout"
        description="Your basket will stay here while you sign in."
        to="/login"
        action="Sign in"
      />
    );
  if (!lines.length)
    return (
      <div className="container page">
        <Empty
          title="Your basket is empty"
          description="Add a few groceries before checking out."
        />
      </div>
    );
  return (
    <div className="container page">
      <PageHeading
        title="One step closer to fresh"
        description="Choose where and when your order should arrive."
      />
      <form
        className="checkout-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setError("");
          if (!availablePin(form.pin)) {
            setError(
              "Delivery is available for supported PIN codes beginning 110, 140, 141 or 160.",
            );
            return;
          }
          setBusy(true);
          try {
            const id = await placeOrder({
              customer: form,
              deliverySlot: form.slot,
              payment: form.payment,
            });
            setPin(form.pin);
            navigate(`/order/${id}`);
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="panel">
          <div className="step-title">
            <span>01</span>
            <h3>Delivery details</h3>
          </div>
          <div className="form-grid">
            {field("name", "Full name", { minLength: 2 })}
            {field("phone", "Mobile number", {
              type: "tel",
              pattern: "[6-9][0-9]{9}",
              title: "10-digit Indian mobile number",
            })}
            {field("email", "Email address", { type: "email" })}
            {field("city", "City", { minLength: 2 })}
            <div className="span-2">
              {field("address", "House / flat, street & locality", {
                minLength: 8,
              })}
            </div>
            {field("pin", "PIN code", {
              inputMode: "numeric",
              pattern: "[0-9]{6}",
              maxLength: 6,
            })}
            <p className="field-help">
              Service areas: Delhi, Mohali, Ludhiana and Chandigarh. Try 160017.
            </p>
          </div>
          <div className="step-title">
            <span>02</span>
            <h3>Choose a delivery slot</h3>
          </div>
          <label>
            Delivery window
            <select
              value={form.slot}
              onChange={(e) => setForm({ ...form, slot: e.target.value })}
            >
              <option>Tomorrow, 8 AM – 11 AM</option>
              <option>Tomorrow, 4 PM – 7 PM</option>
              <option>Day after tomorrow, 8 AM – 11 AM</option>
            </select>
          </label>
          <div className="step-title">
            <span>03</span>
            <h3>Payment method</h3>
          </div>
          <label className="radio-card">
            <input
              type="radio"
              name="payment"
              checked={form.payment === "cod"}
              onChange={() => setForm({ ...form, payment: "cod" })}
            />
            <span>
              <strong>Cash on delivery</strong>
              <small>Pay when your order is delivered. No online charge.</small>
            </span>
          </label>
          <label className="radio-card">
            <input
              type="radio"
              name="payment"
              disabled={!config.paymentsEnabled}
              checked={form.payment === "razorpay"}
              onChange={() => setForm({ ...form, payment: "razorpay" })}
            />
            <span>
              <strong>Razorpay secure checkout (Test Mode)</strong>
              <small>
                {config.paymentsEnabled
                  ? "Pay using Razorpay’s hosted test checkout. No real money is charged."
                  : "Online payment is unavailable until the store owner configures Razorpay test keys."}
              </small>
            </span>
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div>
          <Summary />
          <button
            disabled={busy}
            className="button full place-order"
            type="submit"
          >
            {busy ? "Processing…" : "Place order"} <ArrowRight size={18} />
          </button>
          <p className="field-help">
            Final prices, delivery and stock are validated by the server.
          </p>
        </div>
      </form>
    </div>
  );
}
export function Confirmation() {
  const { id } = useParams();
  const { orders, resumePayment, reconcilePayment, notify } = useShop();
  const [busy, setBusy] = useState(false);
  const order = orders.find((o) => o.id === id);
  if (!order)
    return (
      <Empty
        title="Order not found"
        description="Sign in with the account used to place this order."
        to="/account"
        action="View my account"
      />
    );
  return (
    <div className="container page">
      <div className="confirmation panel">
        <div className="success-icon">
          <PackageCheck size={38} />
        </div>
        <span className="eyebrow">GOOD THINGS ARE ON THEIR WAY</span>
        <h1>
          {order.paymentStatus === "pending"
            ? "Complete your payment"
            : "Thanks for your order!"}
        </h1>
        <p>
          {order.paymentStatus === "pending"
            ? "Your order is saved, but payment is not confirmed."
            : `Your order is ${order.status.toLowerCase()}, ${order.customer.name.split(" ")[0]}.`}
        </p>
        <div className="order-number">{order.id}</div>
        <div className="confirmation-details">
          <div>
            <small>Delivery window</small>
            <strong>{order.deliverySlot}</strong>
          </div>
          <div>
            <small>Order total</small>
            <strong>{money(order.total)}</strong>
          </div>
          <div>
            <small>Delivering to</small>
            <strong>
              {order.customer.address}, {order.customer.city} —{" "}
              {order.customer.pin}
            </strong>
          </div>
        </div>
        <p className="muted">
          Payment:{" "}
          {order.paymentStatus === "paid"
            ? "Verified — Razorpay Test Mode (no real charge)"
            : order.paymentStatus === "cod"
              ? "Cash on delivery — not paid online"
              : "Pending. Do not place another order if you already completed checkout; check payment status below."}
        </p>
        {order.paymentStatus === "pending" && (
          <div className="button-row">
            <button
              className="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await resumePayment(order);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Complete payment
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await reconcilePayment(order.id);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Check payment status
            </button>
          </div>
        )}
        <div className="button-row">
          <Link className="button" to="/account">
            View my orders
          </Link>
          <Link className="secondary" to="/shop">
            Keep exploring
          </Link>
        </div>
      </div>
    </div>
  );
}
