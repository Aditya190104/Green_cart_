## V2.1 optimization update

- Route-level code splitting: checkout, account, admin and catalog load on demand.
- Initial production JavaScript: 306.04 kB (97.44 kB gzip), previously 337.19 kB (104.97 kB gzip). This is a bundle-size measurement, not a measured speed or Lighthouse score.
- Brand filtering with removable active filters and robust URL price parsing.
- Search delivery locations by city/PIN; modal traps keyboard focus, restores focus and locks background scrolling.
- Mobile basket shortcut, loading skeletons, image dimensions and asynchronous image decoding.

### Upgrade an existing V2 installation

Stop the running server with Ctrl+C and back up your entire existing project first, including `.env` and `server/data`. Extract this ZIP into a separate folder. Copy your existing `.env` and complete `server/data` folder into the new project **after the old server is stopped**. If you configured a custom DB_PATH, preserve that database instead. Do not overwrite your existing `.env` with `.env.example`. Then run `npm install` and `npm run dev`. No database migration or new admin account is required; existing accounts, orders and stock remain in the copied database. Keep using the same browser and URL for browser-saved cart/wishlist data.

For a fresh installation, follow the setup instructions below.

# Green Cart V2 — full-stack starter

React + Vite + Tailwind frontend with a Node.js/Express API and persistent SQLite database. Includes 26 local product photographs, 10 familiar Indian branded products, search suggestions, scrolling product/location lists, real password-based accounts, server-enforced admin permissions, COD checkout and Razorpay **Test Mode** integration.

## Start on Windows / VS Code

Use **Node.js 24.15+ in the Node 24 release line** (tested with Node 24.19). Node 22.22.2+ in the Node 22 line is also supported. Older Node installations may not support the bundled SQLite module or test dependencies. Check with `node -v`.

Extract the ZIP to a **new folder**, preserving your V1 project. Open the inner `green-cart-v2` folder that contains `package.json` in VS Code. In Terminal → New Terminal:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Only copy `.env.example` on first setup; do not overwrite an existing `.env` containing your settings.

Open **http://127.0.0.1:5173/**. Use that exact host, not `localhost`, because cookie/origin configuration follows it. Keep the terminal open. `Ctrl+C` stops both processes.

`npm run dev` starts:

- Vite frontend: port 5173
- Express API: port 3001 (Vite proxies `/api`)
- SQLite: `server/data/green-cart.sqlite`, created and seeded automatically

No separate database installation is necessary. No admin password or merchant keys are included.

Linux/macOS use `cp .env.example .env` for the first setup.

## What changed from V1

- Accounts now use server sessions and hashed passwords; sign up again. V1 local demo profiles/orders are not migrated or trusted.
- Products, available inventory and orders persist in SQLite across server restarts.
- Normal users can access only their own orders. Admin routes require an administrator session.
- Prices, stock, delivery and coupon totals are calculated on the server. Browser totals are an estimate until order creation.
- The server ignores submitted totals and validates item IDs/quantities.
- Idempotency keys protect checkout retries from duplicate orders and stock deductions.
- Money calculations use paise precision; FRESH10 is rounded to the nearest rupee, capped at ₹100.
- Cart, wishlist and selected PIN remain browser-local. They are not cross-device account data. Sign-out clears cart/wishlist/coupon.
- Header suggestions support brand names, minor typos and synonyms such as `namak`, `doodh`, `chai`, `aata`, `aloo` and `pyaz`. Arrow keys, Enter and Escape work. No-match searches offer clearly labelled popular alternatives.
- The location selector has a scrolling list of eight configured places plus a PIN input. It is accessible on mobile too.
- A horizontal scrolling branded-product section supplements the original homepage.

## Create an admin

Run in a second terminal in the same project folder:

```powershell
npm run create-admin
```

Enter a separate admin email, name and a password of at least 12 characters. Password input is hidden while typing. Sign in on the website with that account, then open **Admin dashboard** from the footer. Public signup always creates a customer; changing browser state does not grant admin privileges.

Admin can add/edit/delete products, set available stock/prices and advance fulfilment status for confirmed COD or verified online-payment orders. Existing local asset choices are available in the image selector. Product deletion is soft deletion; past orders keep their snapshots.

## Payments — important distinction

COD works immediately without gateway credentials. It creates a server order with `paymentStatus: cod` and does **not** claim that money has been received.

Online payment is disabled until Razorpay test credentials are configured. This release accepts `rzp_test_` keys only and deliberately rejects live keys. No fake “payment successful” switch is present.

1. In your own Razorpay account, select **Test Mode** and generate test API keys.
2. Edit `.env` locally:

```dotenv
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_secret
RAZORPAY_WEBHOOK_SECRET=your_separate_webhook_secret
```

3. Restart `npm run dev` after editing `.env`.
4. Enable automatic capture in the Razorpay test dashboard. Choose Razorpay at checkout and use the provider's documented test payment methods.
5. Verify the order in both Green Cart and the Razorpay dashboard.

Never put secrets in a `VITE_` environment variable, source code, screenshots, chat or Git. The browser receives only the public key ID and gateway order ID. Card/UPI credentials stay in Razorpay's hosted Checkout.

### Verification flow

Server-priced local order → server-created Razorpay order → hosted Checkout → server HMAC verification using the **stored** gateway order ID → payment fetched from Razorpay → exact INR amount, order ID and `captured` status checked → order marked `paid`.

An authorized but uncaptured payment stays pending. Closing checkout or a network error does not mark an order paid. Use **Complete payment** or **Check payment status** in My orders/confirmation. Do not place a new order simply because verification is delayed.

### Webhook recovery

Endpoint: `POST /api/payments/webhook`. Configure `payment.captured` in Razorpay and use the separate webhook secret above. Razorpay must reach a public HTTPS endpoint; `127.0.0.1` is not reachable from its servers. A development tunnel or staging server is needed to test webhooks externally. Raw-body HMAC verification and event-ID deduplication are implemented.

### Reservation behavior

Inventory is reserved when the local order is created, before payment. Pending online orders keep that reservation until payment is reconciled. Automatic expiry/cancellation and refunds are **not implemented** in this release; do not return reserved units to sale while payment might still capture. Add a reviewed provider-aware cancellation/reconciliation process before live trading.

## Product prices and images

26 products: the original 16 plus 10 branded items from Amul, Tata, Britannia, Kissan, Aashirvaad, Fortune, Maggi and Parle.

Branded price references were retrieved on 14 October 2026 from accessible BigBasket listings. Amazon/Flipkart live prices could not be reliably verified. These references are **dated listing snapshots, not current offers or an automatic live sync**, and no delivery location was selected. Some retrieved pages were cached. See `PRICE_SOURCES.md` for exact packs, prices, URLs and caveats.

Stock quantities are seeded development data, not retailer inventory. Retailer/source links appear in product details. Admin can set your own selling prices. Where no MRP was present, the reference price equals the selling price so no unsupported discount is claimed. Original produce pricing/reviews remain illustrative.

All 26 product images are local 600×600 WebP files in `public/products/`. Subject framing was checked in a contact sheet; retailer graphic strips were excluded where possible without cutting off packaging. The same image is used on cards, detail pages, cart and order history. Third-party imagery is for development/reference; obtain appropriate supplier/licensing permission before commercial use. See `ASSET_CREDITS.md`.

## Commands

```bash
npm run dev           # frontend + API
npm run dev:client    # frontend only; requires a running API
npm run dev:server    # API only
npm run create-admin # interactive admin provisioning
npm test             # unit, HTTP API and simulated-DOM integration tests
npm run build        # frontend production build
node scripts/verify-startup.mjs # isolated startup/proxy smoke test; ports must be free
```

For a local built-version check, run `npm run build`, then in PowerShell:

```powershell
$env:APP_ORIGIN = "http://127.0.0.1:3001"
npm start
```

Open http://127.0.0.1:3001. Remove that temporary environment override or open a fresh terminal before returning to `npm run dev`.

## Structure

- `src/components`, `src/pages`: React storefront, dashboards and controls
- `src/context/ShopContext.jsx`: API integration and browser cart/wishlist
- `src/lib/api.js`: API calls and hosted Checkout integration
- `src/lib/shop.js`: pricing helpers shared by client and server
- `src/lib/search.js`: suggestions, synonyms and typo matching
- `src/data`: seed catalog, branded provenance
- `server/app.js`: authentication, products, orders, admin and payment routes
- `server/db.js`: schema, SQLite transactions and seed logic
- `server/security.js`: password hashing, sessions/signature helpers
- `server/gateway.js`: server-only Razorpay adapter
- `scripts`: startup, admin provisioning and smoke test
- `tests`: isolated database/API and frontend integration tests

## Scope before live launch

This is a tested local development/staging foundation, not an audited production commerce service. Actual Razorpay-hosted transactions and full browser visual QA were not completed in this environment; no merchant credentials were available. No real payment is claimed verified.

Before live trading: complete merchant activation, live-key support and acceptance tests; add provider-aware cancellation/refunds and reservation expiry; configure HTTPS, production `APP_ORIGIN`, secure cookies, backups, deployment monitoring and suitable rate limits; add email verification/password recovery and account-linked wishlist/cart if required. No shipping provider, email/SMS sender or tax invoice service is integrated.

`NODE_ENV=production` enables Secure session cookies and therefore requires HTTPS. Run behind a correctly configured reverse proxy; do not blindly trust forwarded IP headers. The bundled SQLite setup is intended for one server instance with a persistent local disk, not multiple replicas or ephemeral/serverless storage.

Database backups must include consistent SQLite state (use SQLite backup tooling or stop the server before copying the database and WAL files). Do not commit `.env` or `server/data/`.

See `VERIFICATION.md` for exact checks and limitations.
