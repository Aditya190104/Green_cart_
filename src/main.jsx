import React, { lazy } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ShopProvider } from "./context/ShopContext";
import { Layout } from "./components/Layout";
import { Empty } from "./components/UI";
import Home from "./pages/Home";
const Catalog = lazy(() => import("./pages/Catalog").then(m => ({ default: m.Catalog })));
const ProductDetails = lazy(() => import("./pages/Catalog").then(m => ({ default: m.ProductDetails })));
const Wishlist = lazy(() => import("./pages/Catalog").then(m => ({ default: m.Wishlist })));
const Cart = lazy(() => import("./pages/Shopping").then(m => ({ default: m.Cart })));
const Checkout = lazy(() => import("./pages/Shopping").then(m => ({ default: m.Checkout })));
const Confirmation = lazy(() => import("./pages/Shopping").then(m => ({ default: m.Confirmation })));
const Auth = lazy(() => import("./pages/Account").then(m => ({ default: m.Auth })));
const Account = lazy(() => import("./pages/Account").then(m => ({ default: m.Account })));
const Admin = lazy(() => import("./pages/Admin"));
const Help = lazy(() => import("./pages/Help"));
import "./styles.css";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <ShopProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="shop" element={<Catalog />} />
            <Route path="product/:id" element={<ProductDetails />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="order/:id" element={<Confirmation />} />
            <Route path="login" element={<Auth />} />
            <Route path="account" element={<Account />} />
            <Route path="admin" element={<Admin />} />
            <Route path="help" element={<Help />} />
            <Route
              path="*"
              element={
                <Empty
                  title="This aisle doesn’t exist"
                  description="Let’s get you back to something fresh."
                  to="/"
                  action="Back to home"
                />
              }
            />
          </Route>
        </Routes>
      </ShopProvider>
    </HashRouter>
  </React.StrictMode>,
);
