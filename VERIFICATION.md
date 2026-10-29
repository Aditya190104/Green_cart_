## V2.1 verification

All 15 automated tests pass, including the expanded UI integration test for brand filtering, location searching, focus trapping and focus restoration. Existing real-server checkout, inventory, authentication and payment-validation tests pass. Production build and actual development-launch smoke test pass. The DOM tests bundle routes together; the Vite production build separately verifies that route chunks are generated. Browser-rendered visual QA and live gateway transactions were not performed.

# Green Cart V2 verification

## Automated checks passed

`npm test`: 15 tests, zero failures.

- Password hashing, sign-in/out, HttpOnly session cookie, server admin guard and cross-origin/custom-header protection.
- Server-controlled prices/totals; checkout retry idempotency; stock deductions once; insufficient stock rejection without partial mutation; invalid quantities.
- Order/payment ownership isolation between accounts.
- Payment callback signature validation using stored provider order ID; rejection of invalid signature, wrong amount, wrong order and authorized-but-not-captured payments; captured payment accepted and replayed idempotently.
- Signed webhook validation and duplicate-event handling.
- Admin field validation, stock edits and fulfilment guard for unpaid orders.
- Test-only gateway configuration rejects absent and live keys.
- Brand/synonym/typo search, pricing/coupon thresholds, paise precision, serviceable PIN rules, catalog ID uniqueness and local image existence.
- A simulated-DOM frontend connected to a real in-memory Express/SQLite API: branded rail; suggestions; location selection; real signup; auth-protected checkout; COD confirmation/stock update; server order history; customer admin-page guard; server-backed admin inventory editing; session revocation; no React runtime warnings during the tested flow.

`npm run build`: passed.

Combined startup/proxy smoke check: Vite + Express started, entry page/API/local image returned HTTP 200, 26 seeded products returned through Vite's API proxy. The check uses a disposable database rather than modifying a user database.

Product asset inspection: all 26 products have local 600×600 images. The new branded images were visually inspected as a contact sheet. Non-product retailer strips were cropped out of Kissan and Parle assets. Narrow bottles intentionally retain side space to keep the full packaging visible.

## Not verified here

- No real Razorpay API/hosted-Checkout transaction was performed because merchant test credentials were not provided. Payment tests use a controlled gateway adapter and verify server logic, not provider account setup.
- No live-money payment support is enabled; only `rzp_test_` keys are accepted.
- No external webhook delivery or production deployment was performed.
- Full rendered desktop/mobile browser visual testing remains outstanding. The available environment previously failed to download Chromium. DOM tests do not prove visual layout, browser focus behavior or gateway popup rendering.

## Manual acceptance with your test keys

1. Run the app, register, select location, search `Maggi`, `namak`, `doodh` and a typo.
2. Verify mobile header, scrolling location list and branded rail in Chrome and a phone browser.
3. Create an admin with the CLI, sign in, edit a decimal price/stock and verify storefront updates.
4. Place COD orders and verify user-specific history and persistence after restart.
5. Configure Razorpay test keys and automatic capture; place a test payment, verify dashboard capture and Green Cart status.
6. Close/fail checkout, retry from My orders and test status reconciliation without making a duplicate order.
7. Configure public HTTPS webhook delivery, then verify recovery when the browser closes before callback verification.
