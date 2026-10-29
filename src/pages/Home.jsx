import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowRight, Leaf, Check, Sparkles } from "lucide-react";
import { useShop } from "../context/ShopContext";
import { categories } from "../data/products";
import { Section, ProductCard } from "../components/UI";
import { Benefits } from "../components/Layout";
export default function Home() {
  const { products } = useShop();
  const group = (filter, n = 5) => products.filter(filter).slice(0, n);
  return (
    <div className="container home">
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span /> FRESH PICKS. EVERY DAY.
          </span>
          <h1>
            A little fresher.
            <br />A whole lot
            <br />
            <em>better.</em>
          </h1>
          <p>
            From farm-fresh favourites to everyday essentials.
            <br className="desktop-break" /> Good food, delivered right to your
            doorstep.
          </p>
          <Link className="button hero-button" to="/shop">
            Fill your basket <ArrowRight size={18} />
          </Link>
          <div className="hero-proof">
            <span className="proof-icon">
              <Leaf size={17} />
            </span>
            <span>Freshness first. Always.</span>
            <span className="proof-divider" />
            <span>From just ₹19</span>
          </div>
        </div>
        <div className="hero-photo">
          <img
            src="hero.jpg"
            alt="Abundant fresh vegetables at a grocery market"
            fetchPriority="high"
          />
          <div className="hero-photo-shade" />
          <div className="hero-sticker">
            <Leaf size={23} />
            <span>
              GOOD FOOD
              <br />
              <strong>GOOD MOOD</strong>
            </span>
          </div>
          <div className="hero-caption">
            <span>THE DAILY FRESH EDIT</span>
            <h3>
              Nature’s best.
              <br />
              At your doorstep.
            </h3>
            <Link to="/shop?category=produce" aria-label="Shop fresh produce">
              <ArrowUpRight size={27} />
            </Link>
          </div>
        </div>
      </section>
      <Benefits />
      <Section
        title="What’s on your list?"
        subtitle="A little of everything, for every day."
        to="/shop"
      >
        <div className="category-shortcuts">
          {categories.map((c) => (
            <Link key={c.id} to={`/shop?category=${c.id}`}>
              <div style={{ background: c.color }}>
                <img src={`products/${c.image}.webp`} alt="" loading="lazy" />
              </div>
              <strong>{c.short}</strong>
              <span>
                Shop now <ArrowRight size={12} />
              </span>
            </Link>
          ))}
          <Link to="/shop?offers=1">
            <div className="offer-circle">
              <span>%</span>
              <Sparkles size={20} />
            </div>
            <strong>Special offers</strong>
            <span>
              Save more <ArrowRight size={12} />
            </span>
          </Link>
        </div>
      </Section>
      <Section
        title="Brands you know. Favourites you love."
        subtitle="Everyday Indian staples, now in your fresh aisle."
        to="/shop?category=snacks"
      >
        <div
          className="product-rail"
          tabIndex={0}
          aria-label="Branded products, scroll horizontally"
        >
          {products
            .filter((p) => p.brand)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </Section>
      <Section
        eyebrow="FRESH FINDS, BIG FAVOURITES"
        title="Trending products"
        subtitle="The good stuff everyone’s adding to their basket."
      >
        <div className="product-grid">
          {group((p) =>
            [
              "apple",
              "green-bell-pepper",
              "milk",
              "strawberry",
              "rice",
            ].includes(p.id),
          ).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </Section>
      <div className="promo-grid">
        <Link className="promo promo-green" to="/shop?category=produce">
          <div>
            <span className="eyebrow">STRAIGHT FROM THE GOOD EARTH</span>
            <h2>
              Fresh picks.
              <br />
              Feel-good prices.
            </h2>
            <p>Save up to 25% on selected produce</p>
            <span className="promo-link">
              Shop fresh <ArrowRight size={17} />
            </span>
          </div>
          <img
            src="products/green-bell-pepper.webp"
            alt="Fresh green capsicum"
          />
        </Link>
        <Link className="promo promo-peach" to="/shop?category=breakfast">
          <div>
            <span className="eyebrow">MAKE MORNINGS BETTER</span>
            <h2>
              A sweeter start
              <br />
              to your day.
            </h2>
            <p>Breakfast essentials, sorted.</p>
            <span className="promo-link">
              Explore breakfast <ArrowRight size={17} />
            </span>
          </div>
          <img src="products/honey-jar.webp" alt="Jar of honey" />
        </Link>
      </div>
      <Section
        title="Best sellers"
        subtitle="Everyday favourites, for a reason."
      >
        <div className="product-grid">
          {group((p) =>
            [
              "eggs",
              "rice",
              "red-onions",
              "nescafe-coffee",
              "honey-jar",
            ].includes(p.id),
          ).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </Section>
      <section className="fresh-band">
        <div>
          <span className="eyebrow">SMALL CHOICES. FRESHER DAYS.</span>
          <h2>
            Good for your kitchen.
            <br />
            Great for your everyday.
          </h2>
          <p>Fill your basket with simple, wholesome favourites.</p>
          <Link className="button light" to="/shop?category=produce">
            Meet the fresh edit <ArrowRight size={17} />
          </Link>
        </div>
        <div className="fresh-points">
          {[
            "Seasonal picks, carefully selected",
            "Everyday value, without compromise",
            "One happy basket at a time",
          ].map((t) => (
            <p key={t}>
              <Check size={19} />
              {t}
            </p>
          ))}
        </div>
      </section>
      <Section
        title="Fresh fruits & vegetables"
        subtitle="Bring a little colour to your plate."
        to="/shop?category=produce"
      >
        <div className="product-grid">
          {group(
            (p) =>
              p.category === "produce" &&
              !["apple", "green-bell-pepper", "strawberry"].includes(p.id),
          ).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </Section>
      <Section
        title="Daily essentials"
        subtitle="Your kitchen’s always-on list."
        to="/shop?category=pantry"
      >
        <div className="product-grid">
          {group((p) =>
            ["milk", "eggs", "rice", "cooking-oil", "juice"].includes(p.id),
          ).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </Section>
      <Section
        title="Special offers"
        subtitle="Fresh savings to make your day."
        to="/shop?offers=1"
      >
        <div className="product-grid">
          {group((p) => (p.mrp - p.price) / p.mrp >= 0.23).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </Section>
      <div className="coupon-banner">
        <div>
          <span className="eyebrow">A LITTLE TREAT FOR YOUR BASKET</span>
          <h2>Your next fresh start is 10% off.</h2>
          <p>Use FRESH10 on orders of ₹499+. Save up to ₹100.</p>
        </div>
        <Link className="button" to="/shop">
          Let’s go shopping <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
