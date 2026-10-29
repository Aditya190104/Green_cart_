import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { useShop } from "../context/ShopContext";
import { searchProducts } from "../lib/search";
import { money } from "../lib/shop";
export default function SearchBox() {
  const { products } = useShop();
  const [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(-1);
  const navigate = useNavigate(),
    ref = useRef();
  const exact = searchProducts(products, query);
  const fallback = products.filter((p) => p.brand).slice(0, 6);
  const matches = query.trim() && exact.length ? exact.slice(0, 6) : fallback;
  useEffect(() => {
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);
  function choose(p) {
    navigate(`/product/${p.id}`);
    setOpen(false);
    setQuery("");
    setActive(-1);
  }
  return (
    <div className="search-wrap" ref={ref}>
      <form
        className="search-box"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && matches[active]) choose(matches[active]);
          else {
            navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
            setOpen(false);
          }
        }}
      >
        <Search size={19} />
        <input
          role="combobox"
          aria-label="Search groceries"
          aria-expanded={open}
          aria-controls="product-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={
            active >= 0 ? `suggestion-${active}` : undefined
          }
          placeholder="Search milk, Maggi, atta, chai…"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(matches.length - 1, i + 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(-1, i - 1));
            }
          }}
        />
        <button aria-label="Submit search">
          <ArrowRight size={18} />
        </button>
      </form>
      {open && (
        <div className="search-suggestions">
          <small>
            {query
              ? exact.length
                ? "Matching & similar products"
                : "No exact match — popular alternatives"
              : "Popular searches"}
          </small>
          <div
            id="product-suggestions"
            role="listbox"
            aria-label="Suggested groceries"
          >
            {matches.map((p, i) => (
              <button
                type="button"
                role="option"
                aria-selected={active === i}
                id={`suggestion-${i}`}
                key={p.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
              >
                <img src={p.image} alt="" />
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.unit}</small>
                </span>
                <b>{money(p.price)}</b>
              </button>
            ))}
          </div>
          {!matches.length && (
            <p>No exact match. Try a brand, category, or “milk”.</p>
          )}
          <button
            type="button"
            className="text-link"
            onClick={() => {
              navigate(`/shop?q=${encodeURIComponent(query)}`);
              setOpen(false);
            }}
          >
            View all results <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
