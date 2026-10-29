import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UserRound,
  Package,
  Heart,
  LogOut,
  ArrowRight,
  Leaf,
} from "lucide-react";
import { useShop } from "../context/ShopContext";
import { PageHeading, Empty, ProductImage } from "../components/UI";
import { money } from "../lib/shop";
export function Auth() {
  const { authenticate } = useShop();
  const [signup, setSignup] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="container auth-page">
      <div className="auth-art">
        <Leaf size={44} />
        <h1>
          Good food.
          <br />
          Great company.
        </h1>
        <p>Your next fresh start is a basket away.</p>
        <img src="products/apple.webp" alt="Fresh red apples" />
      </div>
      <div className="auth-form">
        <span className="eyebrow">WELCOME TO GREEN CART</span>
        <h1>{signup ? "Make yourself at home." : "Fresh to see you again."}</h1>
        <p>
          {signup
            ? "Create your Green Cart account."
            : "Sign in to see your orders and checkout."}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            const d = Object.fromEntries(new FormData(e.currentTarget));
            try {
              await authenticate(signup ? "signup" : "login", d);
              navigate("/account");
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {signup && (
            <label>
              Your name
              <input
                name="name"
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              required
              type="email"
              maxLength={160}
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={signup ? 10 : 1}
              maxLength={128}
              autoComplete={signup ? "new-password" : "current-password"}
            />
          </label>
          {signup && (
            <small>
              Use at least 10 characters. Passwords are securely hashed on the
              server.
            </small>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="button full" disabled={busy}>
            {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
            <ArrowRight size={18} />
          </button>
        </form>
        <p className="auth-switch">
          {signup ? "Already a member?" : "New around here?"}{" "}
          <button
            className="text-button"
            onClick={() => {
              setSignup(!signup);
              setError("");
            }}
          >
            {signup ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  );
}
export function Account() {
  const {
    profile,
    logout,
    saveProfile,
    orders,
    wishlist,
    notify,
    resumePayment,
    reconcilePayment,
  } = useShop();
  const [tab, setTab] = useState("orders"),
    [busy, setBusy] = useState("");
  const navigate = useNavigate();
  if (!profile)
    return (
      <div className="container page">
        <Empty
          icon={UserRound}
          title="Your little corner of Green Cart"
          description="Sign in to view your orders and saved delivery details."
          to="/login"
          action="Sign in"
        />
      </div>
    );
  async function action(key, fn) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="container page">
      <PageHeading
        eyebrow="YOUR GREEN CART"
        title={`Hello, ${profile.name.split(" ")[0]}.`}
        description="A fresh day starts here. Let’s make it a good one."
      />
      <div className="account-layout">
        <aside className="panel account-nav">
          <div className="avatar">{profile.name[0].toUpperCase()}</div>
          <h3>{profile.name}</h3>
          <p>{profile.email}</p>
          <button
            className={tab === "orders" ? "selected" : ""}
            onClick={() => setTab("orders")}
          >
            <Package size={18} />
            My orders <span>{orders.length}</span>
          </button>
          <button
            className={tab === "profile" ? "selected" : ""}
            onClick={() => setTab("profile")}
          >
            <UserRound size={18} />
            Profile & address
          </button>
          <Link to="/wishlist">
            <Heart size={18} />
            Wishlist <span>{wishlist.length}</span>
          </Link>
          {profile.role === "admin" && (
            <Link to="/admin">Store administration</Link>
          )}
          <button
            disabled={!!busy}
            onClick={() =>
              action("logout", async () => {
                await logout();
                navigate("/");
              })
            }
          >
            <LogOut size={18} />
            Sign out
          </button>
          <small>
            Orders and profile are stored securely on your store server.
          </small>
        </aside>
        <section>
          {tab === "orders" ? (
            <>
              <div className="row-between">
                <h2>Your orders</h2>
                <Link className="text-link" to="/shop">
                  Shop again <ArrowRight size={16} />
                </Link>
              </div>
              {orders.length ? (
                orders.map((o) => (
                  <article key={o.id} className="panel account-order">
                    <div className="row-between">
                      <div>
                        <strong className="order-id-short">{o.id}</strong>
                        <p className="muted">
                          {new Date(o.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <span className="status">{o.status}</span>
                    </div>
                    <div className="order-thumbnails">
                      {o.items.map(({ product, qty }) => (
                        <div key={product.id}>
                          <ProductImage product={product} />
                          <span>×{qty}</span>
                        </div>
                      ))}
                    </div>
                    <div className="row-between">
                      <strong>{money(o.total)}</strong>
                      <Link className="text-link" to={`/order/${o.id}`}>
                        View order <ArrowRight size={16} />
                      </Link>
                    </div>
                    <p className="payment-label">
                      Payment:{" "}
                      {o.paymentStatus === "paid"
                        ? "Verified (Razorpay test)"
                        : o.paymentStatus === "cod"
                          ? "Cash on delivery — unpaid"
                          : "Pending verification"}
                    </p>
                    {o.paymentStatus === "pending" && (
                      <div className="button-row">
                        <button
                          className="button"
                          disabled={!!busy}
                          onClick={() => action(o.id, () => resumePayment(o))}
                        >
                          Complete payment
                        </button>
                        <button
                          className="secondary"
                          disabled={!!busy}
                          onClick={() =>
                            action(o.id, () => reconcilePayment(o.id))
                          }
                        >
                          Check payment status
                        </button>
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <Empty
                  title="Your first fresh delivery starts here"
                  description="Once you place an order, it will appear here."
                />
              )}
            </>
          ) : (
            <div className="panel">
              <h2>Profile & delivery address</h2>
              <form
                className="form-grid"
                onSubmit={(e) => {
                  e.preventDefault();
                  const d = Object.fromEntries(new FormData(e.currentTarget));
                  action("profile", () => saveProfile(d));
                }}
              >
                {[
                  ["name", "Full name", "text"],
                  ["phone", "Mobile number", "tel"],
                  ["city", "City", "text"],
                  ["address", "Street address", "text"],
                  ["pin", "PIN code", "text"],
                ].map(([key, label, type]) => (
                  <label key={key}>
                    {label}
                    <input
                      name={key}
                      type={type}
                      required
                      defaultValue={profile[key] || ""}
                      pattern={
                        key === "phone"
                          ? "[6-9][0-9]{9}"
                          : key === "pin"
                            ? "[0-9]{6}"
                            : undefined
                      }
                    />
                  </label>
                ))}
                <button className="button" disabled={!!busy}>
                  {busy ? "Saving…" : "Save details"}
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
