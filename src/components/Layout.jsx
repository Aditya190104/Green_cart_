import { PageSkeleton } from "./UI";
import SearchBox from "./SearchBox";
import { useState, useEffect, useRef, Suspense } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  ShoppingCart,
  Search,
  Heart,
  UserRound,
  MapPin,
  ChevronDown,
  ArrowRight,
  Leaf,
  Truck,
  ShieldCheck,
  Clock3,
  X,
  Menu,
} from "lucide-react";
import { categories } from "../data/products";
import { useShop } from "../context/ShopContext";
import { availablePin, money } from "../lib/shop";
export function Logo() {
  return (
    <Link className="logo" to="/" aria-label="Green Cart home">
      <span className="logo-icon">
        <ShoppingCart size={24} />
        <Leaf size={13} />
      </span>
      green
      <span>
        cart<span className="logo-dot">.</span>
      </span>
    </Link>
  );
}
export function Layout() {
  const { cart, profile, pin, setPin, config, totals } = useShop();
  const [locationQuery, setLocationQuery] = useState("");
  const dialogRef = useRef(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [pinInput, setPinInput] = useState(pin);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  useEffect(() => {
    window.scrollTo(0, 0);
    setMenu(false);
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (!locationOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const fn = (e) => {
      if (e.key === "Escape") setLocationOpen(false);
      if (e.key !== "Tab") return;
      const focusable = [...dialogRef.current.querySelectorAll('button, input, [tabindex="0"]')].filter(el => !el.disabled);
      const first = focusable[0], last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    dialogRef.current.querySelector("button")?.focus();
    document.addEventListener("keydown", fn);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", fn);
      previous?.focus();
    };
  }, [locationOpen]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="announcement">
        <span>Good food. Better days.</span>
        <span>
          Free delivery on orders above ₹499 <ArrowRight size={13} />
        </span>
        <span>Freshness Delivered to Your Doorstep</span>
      </div>
      <header className="site-header">
        <div className="header-main container">
          <Logo />
          <button
            className="location-button"
            onClick={() => {
              setPinInput(pin);
              setLocationQuery("");
              setError("");
              setLocationOpen(true);
            }}
          >
            <MapPin size={19} />
            <span>
              <small>Delivering to</small>
              <strong>
                {pin || "Choose location"} <ChevronDown size={12} />
              </strong>
            </span>
          </button>
          <SearchBox />
          <div className="header-actions">
            <Link to={profile ? "/account" : "/login"} aria-label="My account">
              <UserRound size={21} />
              <span>{profile ? "Account" : "Sign in"}</span>
            </Link>
            <Link to="/wishlist" aria-label="Wishlist">
              <Heart size={21} />
            </Link>
            <Link
              className="cart-link"
              to="/cart"
              aria-label={`Cart, ${count} items`}
            >
              <ShoppingCart size={21} />
              <span>Cart</span>
              {count > 0 && <b>{count}</b>}
            </Link>
            <button
              className="mobile-menu"
              aria-label="Toggle navigation"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
        <nav
          className={`category-nav ${menu ? "open" : ""}`}
          aria-label="Main navigation"
        >
          <div className="container nav-inner">
            <NavLink to="/shop" end>
              <Menu size={16} /> Shop all
            </NavLink>
            {categories.map((c) => (
              <NavLink
                key={c.id}
                to={`/shop?category=${c.id}`}
                className={
                  location.search === `?category=${c.id}` ? "selected" : ""
                }
              >
                {c.name}
              </NavLink>
            ))}
            <Link className="offers-link" to="/shop?offers=1">
              Special offers <span>SALE</span>
            </Link>
          </div>
        </nav>
      </header>
      <main id="main" tabIndex={-1} data-route={location.pathname}>
        <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
      </main>
      {count > 0 && ["/", "/shop", "/wishlist"].includes(location.pathname) && <Link className="mobile-basket" to="/cart">
        <span><strong>{count} items · {money(totals.subtotal)}</strong><small>Review your fresh picks</small></span>
        <span>View basket <ArrowRight size={18} /></span>
      </Link>}
      <footer>
        <div className="container footer-top">
          <div>
            <Logo />
            <p>
              Everyday essentials. A little fresher.
              <br />
              Your neighbourhood market, delivered.
            </p>
            <span className="footer-note">
              Thoughtfully picked. Happily delivered.
            </span>
          </div>
          <div>
            <h4>Explore</h4>
            <Link to="/shop">Shop all groceries</Link>
            <Link to="/shop?category=produce">Fresh produce</Link>
            <Link to="/shop?offers=1">Special offers</Link>
          </div>
          <div>
            <h4>Your Green Cart</h4>
            <Link to="/account">My account & orders</Link>
            <Link to="/wishlist">My wishlist</Link>
            <Link to="/cart">Shopping cart</Link>
          </div>
          <div>
            <h4>Here to help</h4>
            <Link to="/help">Delivery & FAQs</Link>
            <Link to="/help#returns">Freshness promise</Link>
            <Link to="/admin">Admin dashboard</Link>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} Green Cart. Made for fresher days.
          </span>
          <span>Secure checkout · Razorpay Test Mode</span>
        </div>
      </footer>
      {locationOpen && (
        <div className="modal-backdrop" onClick={() => setLocationOpen(false)}>
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-title"
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="Close location selector"
              onClick={() => setLocationOpen(false)}
            >
              <X />
            </button>
            <MapPin className="green" size={32} />
            <h2 id="location-title">Freshness, near you.</h2>
            <p>Check delivery availability with your PIN code.</p>
            <label className="location-search">Find your area
              <input type="search" value={locationQuery} onChange={e => setLocationQuery(e.target.value)} placeholder="Search city or PIN code" />
            </label>
            <div
              className="location-list"
              aria-label="Available delivery locations"
              tabIndex={0}
            >
              {config.locations.filter(place => `${place.city} ${place.pin}`.toLowerCase().includes(locationQuery.trim().toLowerCase())).map((place) => (
                <button
                  key={place.pin}
                  type="button"
                  onClick={() => {
                    setPin(place.pin);
                    setLocationOpen(false);
                  }}
                >
                  <MapPin size={17} />
                  <span>
                    <strong>{place.city}</strong>
                    <small>{place.pin}</small>
                  </span>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>
            {!config.locations.some(place => `${place.city} ${place.pin}`.toLowerCase().includes(locationQuery.trim().toLowerCase())) && <p role="status">No matching area. Check your PIN below.</p>}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (availablePin(pinInput)) {
                  setPin(pinInput);
                  setLocationOpen(false);
                } else
                  setError(
                    "Try a supported PIN beginning with 110, 140, 141 or 160.",
                  );
              }}
            >
              <label>
                6-digit PIN code
                <input
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) =>
                    setPinInput(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="160017"
                />
              </label>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <button className="button full">Check & save location</button>
            </form>
            <small>
              Configured service areas: Delhi, Mohali, Ludhiana and Chandigarh.
            </small>
          </section>
        </div>
      )}
    </>
  );
}
export function Benefits() {
  return (
    <div className="benefits">
      {[
        [Truck, "At your doorstep", "Free delivery over ₹499"],
        [Leaf, "Picked with care", "Freshness you can feel"],
        [ShieldCheck, "Shop with confidence", "Quality in every basket"],
        [Clock3, "On your schedule", "Choose your delivery slot"],
      ].map(([Icon, title, sub]) => (
        <div key={title}>
          <Icon size={25} />
          <span>
            <strong>{title}</strong>
            <small>{sub}</small>
          </span>
        </div>
      ))}
    </div>
  );
}
