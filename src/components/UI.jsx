import { Link } from "react-router-dom";
import {
  Plus,
  Minus,
  Heart,
  ArrowRight,
  ShoppingBasket,
  Star,
} from "lucide-react";
import { useShop } from "../context/ShopContext";
import { money, discount } from "../lib/shop";
export function ProductImage({ product, ...props }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}${product.image}`}
      alt={product.name}
      width={600}
      height={600}
      decoding="async"
      {...props}
    />
  );
}
export function Quantity({ product, qty }) {
  const { setQuantity } = useShop();
  return (
    <div className="quantity">
      <button
        aria-label={`Decrease ${product.name}`}
        onClick={() => setQuantity(product.id, qty - 1)}
      >
        <Minus size={15} />
      </button>
      <span aria-live="polite">{qty}</span>
      <button
        aria-label={`Increase ${product.name}`}
        disabled={qty >= product.stock}
        onClick={() => setQuantity(product.id, qty + 1)}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
export function ProductCard({ product: p }) {
  const { add, cart, wishlist, toggleWish } = useShop();
  return (
    <article className="product-card">
      <div className="product-visual">
        {discount(p) > 0 && (
          <span className="discount">{discount(p)}% OFF</span>
        )}
        <button
          className={`wish-button ${wishlist.includes(p.id) ? "saved" : ""}`}
          aria-label={`${wishlist.includes(p.id) ? "Remove" : "Save"} ${p.name} ${wishlist.includes(p.id) ? "from" : "to"} wishlist`}
          aria-pressed={wishlist.includes(p.id)}
          onClick={() => toggleWish(p.id)}
        >
          <Heart size={18} />
        </button>
        <Link to={`/product/${p.id}`}>
          <ProductImage product={p} loading="lazy" />
        </Link>
      </div>
      <div className="product-body">
        <div className="product-meta">
          <span>{p.badge}</span>
          <span className="rating">
            <Star size={11} fill="currentColor" />
            {p.rating || "New"}
          </span>
        </div>
        <Link className="product-name" to={`/product/${p.id}`}>
          {p.name}
        </Link>
        <p className="unit">{p.unit}</p>
        <div className="price-row">
          <div>
            <strong>{money(p.price)}</strong> <del>{money(p.mrp)}</del>
          </div>
          {cart[p.id] ? (
            <Quantity product={p} qty={cart[p.id]} />
          ) : (
            <button
              className="add-button"
              disabled={!p.stock}
              onClick={() => add(p.id)}
              aria-label={`Add ${p.name} to cart`}
            >
              {p.stock ? "ADD" : "SOLD OUT"}
              {p.stock > 0 && <Plus size={15} />}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
export function Section({ title, eyebrow, subtitle, children, to = "/shop" }) {
  return (
    <section className="section">
      <div className="section-heading">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <Link className="text-link" to={to}>
          View all <ArrowRight size={17} />
        </Link>
      </div>
      {children}
    </section>
  );
}
export function Empty({
  title,
  description,
  icon: Icon = ShoppingBasket,
  to = "/shop",
  action = "Explore groceries",
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={34} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      <Link className="button" to={to}>
        {action}
        <ArrowRight size={17} />
      </Link>
    </div>
  );
}
export function PageHeading({ eyebrow, title, description }) {
  return (
    <div className="page-heading">
      <span className="eyebrow">{eyebrow || "THE GREEN CART EDIT"}</span>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}

export function PageSkeleton() {
  return <div className="container page" role="status" aria-label="Loading groceries" aria-busy="true">
    <span className="sr-only">Loading groceries…</span>
    <div className="skeleton skeleton-heading" />
    <div className="catalog-grid">{Array.from({length: 8}, (_, i) => <div key={i} className="skeleton skeleton-card" />)}</div>
  </div>;
}
