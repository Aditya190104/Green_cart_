import { searchProducts } from "../lib/search";
import { useState } from "react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import {
  Heart,
  Star,
  Truck,
  ShieldCheck,
  ArrowLeft,
  SlidersHorizontal,
} from "lucide-react";
import { useShop } from "../context/ShopContext";
import { categories } from "../data/products";
import {
  ProductCard,
  ProductImage,
  Quantity,
  PageHeading,
  Empty,
  Section,
} from "../components/UI";
import { money, discount } from "../lib/shop";
export function Catalog() {
  const { products } = useShop();
  const [params, setParams] = useSearchParams();
  const [mobileFilters, setMobileFilters] = useState(false);
  const cat = params.get("category") || "";
  const q = params.get("q") || "";
  const sort = params.get("sort") || "featured";
  const rawMax = Number(params.get("max") || 1000);
  const max = Number.isFinite(rawMax) ? Math.min(1000, Math.max(20, rawMax)) : 1000;
  const brand = params.get("brand") || "";
  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
  const inStock = params.get("stock") === "1";
  const offers = params.get("offers") === "1";
  const update = (key, value) => {
    const n = new URLSearchParams(params);
    if (value) n.set(key, value);
    else n.delete(key);
    setParams(n, { replace: true });
  };
  let filtered = searchProducts(products, q).filter(
    (p) =>
      (!cat || p.category === cat) &&
      (!brand || p.brand === brand) &&
      p.price <= max &&
      (!inStock || p.stock > 0) &&
      (!offers || discount(p) >= 20),
  );
  if (sort === "low") filtered.sort((a, b) => a.price - b.price);
  if (sort === "high") filtered.sort((a, b) => b.price - a.price);
  if (sort === "rating") filtered.sort((a, b) => b.rating - a.rating);
  if (sort === "discount") filtered.sort((a, b) => discount(b) - discount(a));
  return (
    <div className="container page">
      <div className="breadcrumb">
        <Link to="/">Home</Link> / Shop
      </div>
      <PageHeading
        title={
          q
            ? `Results for “${q}”`
            : offers
              ? "Fresh deals. Happy baskets."
              : categories.find((c) => c.id === cat)?.name ||
                "Your everyday, a little fresher."
        }
        description="Thoughtfully selected groceries. Everyday value. All in one basket."
      />
      <div className="catalog-layout">
        <aside id="catalog-filters" className={`filter-panel ${mobileFilters ? "visible" : ""}`}>
          <div className="row-between">
            <h3>Filters</h3>
            <button className="text-button" onClick={() => setParams({})}>
              Reset all
            </button>
          </div>
          <fieldset>
            <legend>Categories</legend>
            <label className="check-label">
              <input
                type="radio"
                name="category"
                checked={!cat}
                onChange={() => update("category", "")}
              />
              All groceries
            </label>
            {categories.map((c) => (
              <label className="check-label" key={c.id}>
                <input
                  type="radio"
                  name="category"
                  checked={cat === c.id}
                  onChange={() => update("category", c.id)}
                />
                {c.name}
              </label>
            ))}
          </fieldset>
          <fieldset><legend>Brand</legend>
            <label htmlFor="brand-filter" className="sr-only">Filter by brand</label>
            <select id="brand-filter" value={brand} onChange={e => update("brand", e.target.value)}>
              <option value="">All brands</option>{brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </fieldset>
          <fieldset>
            <legend>Price range</legend>
            <label htmlFor="max-price">Up to {money(max)}</label>
            <input
              id="max-price"
              type="range"
              min="20"
              max="1000"
              step="5"
              value={max}
              onChange={(e) => update("max", e.target.value)}
            />
            <div className="row-between muted">
              <small>₹20</small>
              <small>₹1,000</small>
            </div>
          </fieldset>
          <fieldset>
            <legend>Availability & offers</legend>
            <label className="check-label">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => update("stock", e.target.checked ? "1" : "")}
              />
              In stock only
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={offers}
                onChange={(e) => update("offers", e.target.checked ? "1" : "")}
              />
              20% off or more
            </label>
          </fieldset>
          <div className="filter-promo">
            <span>FRESH10</span>
            <p>
              10% off your basket
              <br />
              on orders over ₹499.
            </p>
            <small>Maximum saving ₹100</small>
          </div>
        </aside>
        <div>
          <div className="catalog-toolbar">
            <span>
              <strong>{filtered.length}</strong> products
            </span>
            <button
              className="filter-toggle secondary"
              aria-expanded={mobileFilters}
              aria-controls="catalog-filters"
              onClick={() => setMobileFilters(!mobileFilters)}
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>
            <label>
              Sort by{" "}
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(e) => update("sort", e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
                <option value="rating">Top rated</option>
                <option value="discount">Biggest discount</option>
              </select>
            </label>
          </div>
          <div className="active-filters" aria-label="Active filters">
            {[["q", q], ["category", cat && (categories.find(c => c.id === cat)?.name || cat)], ["brand", brand], ["stock", inStock && "In stock"], ["offers", offers && "20%+ off"], ["max", params.has("max") && `Up to ${money(max)}`]].filter(([, value]) => value).map(([key, value]) => <button key={key} onClick={() => update(key, "")} aria-label={`Remove filter ${value}`}>{value}<span aria-hidden="true"> ×</span></button>)}
          </div>
          {filtered.length ? (
            <div className="catalog-grid">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No groceries found</h2>
              <p>Try another search or reset your filters.</p>
              <button className="button" onClick={() => setParams({})}>
                Reset filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export function ProductDetails() {
  const { id } = useParams();
  const { products, cart, add, wishlist, toggleWish } = useShop();
  const p = products.find((p) => p.id === id);
  if (!p)
    return (
      <Empty
        title="This product isn’t available"
        description="Explore the rest of our fresh collection."
      />
    );
  return (
    <div className="container page">
      <div className="breadcrumb">
        <Link to="/shop">Shop</Link> /{" "}
        <Link to={`/shop?category=${p.category}`}>
          {categories.find((c) => c.id === p.category)?.name}
        </Link>{" "}
        / {p.name}
      </div>
      <div className="detail-grid">
        <div className="detail-image">
          {discount(p) > 0 && (
            <span className="discount">{discount(p)}% OFF</span>
          )}
          <ProductImage product={p} />
        </div>
        <div className="detail-copy">
          <span className="eyebrow">{p.badge}</span>
          <h1>{p.name}</h1>
          <p className="muted">{p.unit}</p>
          <p className="detail-rating">
            <Star size={17} fill="currentColor" />
            {p.rating || "New"} <span>· {p.reviews} sample ratings</span>
          </p>
          <p>{p.description}</p>
          <div className="detail-price">
            <strong>{money(p.price)}</strong>
            <del>{money(p.mrp)}</del>
            <span>Save {money(p.mrp - p.price)}</span>
          </div>
          <small className="muted">
            Inclusive of all taxes · Price per pack
          </small>
          <div className="detail-actions">
            {cart[p.id] ? (
              <Quantity product={p} qty={cart[p.id]} />
            ) : (
              <button
                className="button"
                disabled={!p.stock}
                onClick={() => add(p.id)}
              >
                {p.stock ? "Add to basket" : "Out of stock"}
              </button>
            )}
            <button className="secondary" onClick={() => toggleWish(p.id)}>
              <Heart
                size={18}
                fill={wishlist.includes(p.id) ? "currentColor" : "none"}
              />
              {wishlist.includes(p.id) ? "Saved" : "Save for later"}
            </button>
          </div>
          <p className={p.stock ? "green" : "error"}>
            {p.stock
              ? `${p.stock} packs available`
              : "Back soon — currently sold out"}
          </p>
          <div className="detail-perks">
            <p>
              <Truck size={19} />
              Free delivery on orders over ₹499
            </p>
            <p>
              <ShieldCheck size={19} />
              Carefully selected for your everyday
            </p>
          </div>
          {p.priceSource && (
            <p className="price-provenance">
              Reference:{" "}
              <a href={p.priceSource.url} target="_blank" rel="noreferrer">
                {p.priceSource.retailer}
              </a>{" "}
              · retrieved {p.priceSource.checkedAt}. Store price, not a live
              marketplace quote.
            </p>
          )}
          <details open>
            <summary>Storage & care</summary>
            <p>{p.storage}</p>
          </details>
          <details>
            <summary>Product information</summary>
            <p>
              Pack size: {p.unit}. Photography is representative; packaging and
              produce appearance may vary. This frontend uses illustrative
              prices and product information.
            </p>
          </details>
        </div>
      </div>
      <Section
        title="A little more for your basket"
        to={`/shop?category=${p.category}`}
      >
        <div className="product-grid">
          {products
            .filter((x) => x.id !== p.id && x.category === p.category)
            .slice(0, 5)
            .map((x) => (
              <ProductCard key={x.id} product={x} />
            ))}
        </div>
      </Section>
    </div>
  );
}
export function Wishlist() {
  const { products, wishlist } = useShop();
  const list = products.filter((p) => wishlist.includes(p.id));
  return (
    <div className="container page">
      <PageHeading
        title="Your fresh favourites"
        description="A little list of things you love. Ready when you are."
      />
      {list.length ? (
        <div className="product-grid">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <Empty
          icon={Heart}
          title="Save a little goodness"
          description="Tap the heart on any product to keep it here for later."
        />
      )}
    </div>
  );
}
