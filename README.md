# Noor — hijab boutique (front-end prototype)

A complete e-commerce storefront prototype for a modest-wear label, built with plain **HTML, CSS and vanilla JavaScript**. There is no backend and no build step: products, cart, wishlist, orders and reviews all live in the browser's `localStorage`, and checkout is a **payment simulation**.

Open `index.html` and it runs. For the most consistent behaviour (fonts, storage, history), serve the folder:

```bash
# from this folder
python -m http.server 8080
# then open http://localhost:8080
```

---

## What is included

**Storefront**
- 24 products across 6 collections, each with 3 colourways, fabric, badges and pricing.
- All product imagery is generated as inline SVG at runtime — no external image files, so it works offline.
- Home page: hero, collection grid, bestsellers, editorial section, testimonials, newsletter.
- Shop: live search, collection / fabric / colour filters, price slider, 5 sort modes, active-filter chips, empty state.
- Product page: colour swatches that recolour the artwork live, three image views (drape / folded / detail), quantity, add to bag, wishlist, accordions, ratings, review distribution, write-a-review form, related products.
- Cart drawer and full cart page, free-shipping progress bar, promo codes, 8% tax.
- Wishlist persisted to storage.
- Order history with expandable details, receipt and reorder.
- Multi-currency toggle: USD / GBP / EUR (fixed conversion rates, prices stored as US cents).
- About page with brand story, values and FAQ.

**Checkout simulation**
- Card: Luhn check, expiry validation, CVC, live card preview and animated authorisation.
- Wallet: Apple Pay / Google Pay / Noor Pay one-tap simulation.
- Cash on delivery.
- Promo codes, standard/express delivery, order confirmation page.

**Studio (admin)**
- Route `#/admin`, passcode `noor`.
- Add products (name, collection, price, fabric, artwork style, colours, badge, description, care, featured) — they appear in the shop immediately.
- Edit the price of added products, delete them, hide or restore the built-in catalogue.
- Stats, recent orders, reset-everything button.

---

## Demo details

| Item | Value |
| --- | --- |
| Studio passcode | `noor` |
| Approving card | `4242 4242 4242 4242` |
| Declining card | `4000 0000 0000 0002` |
| Expiry / CVC | any future date, any 3–4 digits |
| Promo codes | `NOOR10` (10%), `WELCOME15` (15%), `EID20` (20% over $80), `FREESHIP` |
| Shipping | free over $75 · standard $6.50 · express $14.00 |
| Tax | 8% |

Nothing is charged, nothing ships. Card data never leaves the page.

---

## Project structure

```
index.html                  app shell: header, drawers, footer, script tags
assets/css/styles.css       design system + all page styles (responsive)
assets/js/data.js           catalogue, collections, reviews, promos, currencies
assets/js/art.js            procedural SVG product illustrations
assets/js/store.js          state, localStorage persistence, cart, totals, orders
assets/js/views.js          every page as a template + local behaviour
assets/js/checkout.js       checkout form, validation, payment simulation
assets/js/admin.js          studio passcode gate and catalogue management
assets/js/app.js            hash router, header chrome, drawers, toasts, events
preview-home.png            screenshot
preview-product.png         screenshot
```

## Storage keys

Everything is namespaced under `noor.v1.`: `cart`, `wishlist`, `orders`, `customProducts`, `hiddenIds`, `reviews`, `promo`, `delivery`, `currency`, `subscribers`.

Reset via **Studio → Reset demo data**, or clear site data for the page.

## Prototype limitations

- No server, accounts, stock, search backend or real payments; the admin passcode is cosmetic.
- Currency conversion is a fixed snapshot rate, not live FX.
- Product art is illustrative, not photography.
- Order emails/receipts are simulated copy only.
