import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  IndianRupee,
  ShoppingBag,
  AlertTriangle,
  X,
} from "lucide-react";
import { useShop } from "../context/ShopContext";
import { categories, initialProducts } from "../data/products";
import { money, validProduct } from "../lib/shop";
import { PageHeading, ProductImage, Empty } from "../components/UI";
const blank = {
  name: "",
  category: "produce",
  unit: "500 g",
  price: 0,
  mrp: 0,
  stock: 0,
  image: "products/apple.webp",
  badge: "Fresh pick",
  description: "",
  storage: "Store in a cool, dry place.",
  rating: 4.8,
  reviews: 0,
};
export default function Admin() {
  const {
    products,
    saveProduct,
    orders,
    updateOrder,
    deleteProduct,
    notify,
    profile,
  } = useShop();
  const [tab, setTab] = useState("products");
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState(null);
  const [remove, setRemove] = useState(null);
  const [error, setError] = useState("");
  const update = (key, value) => setEdit({ ...edit, [key]: value });
  const save = async (e) => {
    e.preventDefault();
    if (!validProduct(edit)) {
      setError(
        "Use a positive price, MRP ≥ price, and a non-negative whole stock quantity.",
      );
      return;
    }
    try {
      await saveProduct(edit);
      setEdit(null);
    } catch (e) {
      setError(e.message);
    }
  };
  if (profile?.role !== "admin")
    return (
      <Empty
        title="Store administration"
        description="Sign in with an administrator account to manage your store."
        to="/login"
        action="Sign in"
      />
    );

  return (
    <div className="container page">
      <PageHeading
        eyebrow="GREEN CART · STORE DESK"
        title="A fresh view of your store"
        description="Manage your catalog, inventory and orders."
      />
      <div className="demo-notice">
        Administrator access · Changes are validated and saved on the server.
      </div>
      <div className="stats-grid">
        {[
          [Package, products.length, "Products"],
          [ShoppingBag, orders.length, "Orders"],
          [
            IndianRupee,
            money(orders.reduce((n, o) => n + o.total, 0)),
            "Order value",
          ],
          [
            AlertTriangle,
            products.filter((p) => p.stock <= 10).length,
            "Low-stock products",
          ],
        ].map(([Icon, value, label]) => (
          <div className="panel stat" key={label}>
            <Icon size={22} />
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="admin-toolbar">
        <div className="tabs">
          <button
            className={tab === "products" ? "active" : ""}
            onClick={() => setTab("products")}
          >
            Products & inventory
          </button>
          <button
            className={tab === "orders" ? "active" : ""}
            onClick={() => setTab("orders")}
          >
            Orders
          </button>
        </div>
        {tab === "products" && (
          <button
            className="button"
            onClick={() => {
              setEdit({ ...blank });
              setError("");
            }}
          >
            <Plus size={17} />
            Add product
          </button>
        )}
      </div>
      {tab === "products" ? (
        <div className="panel">
          <label className="admin-search">
            Search catalog
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
            />
          </label>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Inventory</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products
                  .filter((p) =>
                    p.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="table-product">
                          <ProductImage product={p} />
                          <div>
                            <strong>{p.name}</strong>
                            <small>{p.unit}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {categories.find((c) => c.id === p.category)?.short}
                      </td>
                      <td>{money(p.price)}</td>
                      <td>{p.stock} packs</td>
                      <td>
                        <span
                          className={`status ${p.stock <= 10 ? "warning" : ""}`}
                        >
                          {p.stock === 0
                            ? "Out of stock"
                            : p.stock <= 10
                              ? "Low stock"
                              : "In stock"}
                        </span>
                      </td>
                      <td>
                        <div className="button-row">
                          <button
                            className="icon-button"
                            aria-label={`Edit ${p.name}`}
                            onClick={() => {
                              setEdit({ ...p });
                              setError("");
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Delete ${p.name}`}
                            onClick={() => setRemove(p)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!products.some((p) =>
              p.name.toLowerCase().includes(query.toLowerCase()),
            ) && <p className="empty-table">No matching products.</p>}
          </div>
        </div>
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{o.customer.name}</td>
                  <td>{money(o.total)}</td>
                  <td>
                    <select
                      aria-label={`Status for ${o.id}`}
                      value={o.status}
                      disabled={o.paymentStatus === "pending"}
                      onChange={(e) =>
                        updateOrder(o.id, e.target.value).catch((e) =>
                          notify(e.message),
                        )
                      }
                    >
                      {[
                        ...(o.paymentStatus === "pending"
                          ? ["Awaiting payment"]
                          : []),
                        "Confirmed",
                        "Packing",
                        "Out for delivery",
                        "Delivered",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders.length && (
            <p className="empty-table">
              No orders yet. Place an order in the storefront.
            </p>
          )}
        </div>
      )}
      {edit && (
        <div className="modal-backdrop">
          <section
            className="modal admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-title"
          >
            <button
              className="modal-close icon-button"
              aria-label="Close product editor"
              onClick={() => setEdit(null)}
            >
              <X />
            </button>
            <h2 id="edit-title">
              {edit.id ? "Edit product" : "Add a fresh favourite"}
            </h2>
            <form onSubmit={save}>
              <div className="form-grid">
                <label>
                  Product name
                  <input
                    autoFocus
                    required
                    value={edit.name}
                    onChange={(e) => update("name", e.target.value)}
                  />
                </label>
                <label>
                  Category
                  <select
                    value={edit.category}
                    onChange={(e) => update("category", e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Pack size
                  <input
                    required
                    value={edit.unit}
                    onChange={(e) => update("unit", e.target.value)}
                  />
                </label>
                <label>
                  Stock (packs)
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={edit.stock}
                    onChange={(e) => update("stock", Number(e.target.value))}
                  />
                </label>
                <label>
                  Price (₹)
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={edit.price}
                    onChange={(e) => update("price", Number(e.target.value))}
                  />
                </label>
                <label>
                  MRP (₹)
                  <input
                    type="number"
                    required
                    min={edit.price || 1}
                    step="0.01"
                    value={edit.mrp}
                    onChange={(e) => update("mrp", Number(e.target.value))}
                  />
                </label>
                <label className="span-2">
                  Local product photograph
                  <select
                    value={edit.image}
                    onChange={(e) => update("image", e.target.value)}
                  >
                    {initialProducts.map((p) => (
                      <option key={p.id} value={p.image}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="span-2">
                  Description
                  <textarea
                    required
                    value={edit.description}
                    onChange={(e) => update("description", e.target.value)}
                  />
                </label>
              </div>
              {error && <p className="error">{error}</p>}
              <button className="button full">Save product</button>
            </form>
          </section>
        </div>
      )}
      {remove && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <h2 id="delete-title">Remove {remove.name}?</h2>
            <p>
              This removes it from the catalog, cart and wishlist. Past orders
              keep their original details.
            </p>
            <div className="button-row">
              <button
                autoFocus
                className="secondary"
                onClick={() => setRemove(null)}
              >
                Keep product
              </button>
              <button
                className="button danger"
                onClick={async () => {
                  try {
                    await deleteProduct(remove.id);
                    setRemove(null);
                  } catch (e) {
                    notify(e.message);
                  }
                }}
              >
                Remove product
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
