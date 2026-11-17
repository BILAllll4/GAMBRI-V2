# GNAWA — The Rhythm of an Ancient Soul

A four-part immersive website about Gnawa music: a cinematic intro, an editorial story, a playable 3D guembri and a "green portal" into a working store (React + Three.js front end, Express + MySQL back end).

## GAMBRI_V2

A copy of the original project with a new guembri experience. It runs beside the original: web on **http://localhost:5177**, API on **8788**, database **gnawa_v2** (see `.env`, `vite.config.ts`).

## Run it

Requirements: Node 20+, MySQL 8 or MariaDB 10.4+ (XAMPP's MariaDB works).

```bash
npm install
cp .env.example .env      # set DB_USER / DB_PASSWORD if needed
npm run db:setup          # creates database "gnawa", tables and the demo catalogue
npm run dev               # web on http://localhost:5173, API on http://localhost:8787
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite + API together (Vite proxies `/api`) |
| `npm run db:setup` | (Re)creates tables and reloads the demo catalogue. **Wipes orders.** |
| `npm run db:sync` | Adds the categories and products from `server/seed.ts` that are missing. Leaves existing products, prices, stock and orders untouched. |
| `npm run build` | Type-check + production build into `dist/` |
| `npm run api:start` | API only (production) |

## The experience

| # | Section | Highlights |
|---|---|---|
| I | **Intro** (`#intro`) | Full-screen film, deep-green grade, grain, GSAP letter and line reveals, scroll pushes the film back |
| II | **From ritual to new terrain** (`#ritual`) | Beige editorial page: oversized type, stat strip, asymmetric chapters, parallax figures, drifting shapes, scroll marquee, sourced-facts panel, fades into olive |
| III | **The guembri — V2** (`#guembri-intro` → `#guembri`) | SELECT → ZOOM OUT → ISOLATE → TRANSITION → PLAY in one canvas (`GuembriJourney.tsx`, `GuembriScene.tsx`, timeline in `journey.ts`). A large upright guembri (360° drag) with its details at the top right and a carousel of three small 3D guembris between two arrows at the bottom (click a model, an arrow, a name or ←/→). The three choices are the project's one GLB in three catalogue finishes (`src/data/selection.ts`). Scrolling pulls the scene back, removes the carousel and details, isolates the chosen instrument in a pool of light, turns it flat and hands over to the playing scene (strings, notes, keys, music list) |
| IV | **The portal & showroom** (`#portal`) | Scroll-scrubbed 3D doorway after the traditional doors of Tiznit (`TiznitDoor.tsx`, references in its header comment): earth rampart, ochre stucco surround with lattice band, scalloped arch, star roundels, blue nailed leaves with knocker. The doors open onto three display cards (3D guembri, name, price, line); hover turns an instrument, click opens it (`PortalShowroom.tsx`). A link leads to the collection page |
| — | **Collection** (`/store`) | A store page of its own: featured banner with a live 3D piece, sticky category / in-stock / sort toolbar (kept in the URL), a 2–4 column grid of 4:5 plates with live 3D models that turn on hover (or a labelled illustration), badges and quick add-to-cart (`StorePage.tsx`, `src/data/collection.ts`) |
| — | **Store** (`/store/:slug`, `/cart`, `/checkout`, `/order/:ref`) | 3D product viewer with variants, persistent cart (ivory cart page with live 3D lines and a sticky summary; matching drawer), validated cash-on-delivery checkout, confirmation page. The header (`Nav.tsx`) shows only the mark, Collection and Cart and adapts to the ground under it (`data-nav` on each section) |

Smooth scrolling uses Lenis on GSAP's ticker, scroll animations use ScrollTrigger, and UI motion uses Framer Motion. Route changes play an olive or gold curtain. `prefers-reduced-motion` turns off smooth scroll and camera flights.

Guembri controls: click a string (open note) or a note button (stopped note). **Space** plays the demo, **M** mutes. Keys only play while the guembri section is on screen, and never while you type in a form.

## Languages and lettering

- **EN / FR / العربية**: the switch in the header (`LangSwitch.tsx`) sets the language for the whole interface; Arabic switches the page to right-to-left. Interface copy lives with each component or in `src/lib/copy.ts`; product names and descriptions are shown as stored in the database.
- **Tifinagh**: background lettering in Neo-Tifinagh (IRCAM standard, Noto Sans Tifinagh) across the hero, story, guembri, showroom and store (`TifinaghField.tsx`). Letters are used as letterforms; the only words are verified ones (ⵜⴰⵛⵍⵃⵉⵢⵜ Taclḥiyt, ⵜⵉⴼⵉⵏⴰⵖ Tifinagh, ⴰⵎⴰⵣⵉⵖ Amaziɣ), listed in that file.

## Store back end

- Tables: `categories`, `products`, `variants`, `customers`, `orders`, `order_items` (`server/schema.sql`).
- `POST /api/orders` validates with the same Zod schema as the form (`shared/schemas.ts`). Moroccan phone formats are accepted. Prices and stock are **read from the database inside a transaction**; the client only sends ids and quantities. Stock is decremented atomically, and an order gets a reference like `GN-3MW6WQ`.
- `GET /api/orders/:ref` returns a confirmation without phone, email or street address.
- Payment: **cash on delivery** only. Card payment is shown as unavailable until a Moroccan provider (e.g. CMI) is configured. No fake payment flow exists.
- Delivery fee: `SHIPPING_FLAT_MAD` in `.env` (default 0, so the customer is told the fee is "confirmed by phone").

## Online payment, reviews, workshop, analytics

Everything below is switched on from `.env` (see `.env.example`); with the keys empty the site behaves as before. Restart `npm run dev` after editing `.env`.

| Feature | Turn it on | Where |
|---|---|---|
| **Card payment (CMI)** | `CMI_CLIENT_ID`, `CMI_STORE_KEY` from your bank; `CMI_GATEWAY_URL` (test by default); `PUBLIC_URL` = the real site address | `server/routes/payments.ts`. Checkout creates the order (stock reserved), posts a signed form to CMI; CMI's server callback marks it paid (hash-checked). Test the whole flow on CMI's test gateway before going live |
| **PayPal** | `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_ENV`, `PAYPAL_CURRENCY`, `PAYPAL_MAD_RATE` (> 0) | PayPal does not settle MAD: totals are converted at your rate. Order created and captured by the server; buttons on `/order/:ref` |
| Unpaid orders | `UNPAID_HOLD_MINUTES` (60) | Online orders not paid in time are cancelled and their stock is released every 5 min |
| **Reviews** | `ADMIN_TOKEN` (long random string) | Form + list under each product (`src/pages/store/Reviews.tsx`). New reviews are hidden until approved at **`/admin/reviews`**. An order reference containing the product marks it "verified purchase". Rate-limited, honeypot against bots |
| **Workshop videos / Instagram** | Edit `src/data/workshop.ts` | Section V on the home page. Videos go in `public/videos/workshop/`; Instagram posts/reels by link (official embed, no token). Placeholders until filled |
| **Analytics** | `VITE_PLAUSIBLE_DOMAIN` and/or `VITE_GA_ID` | `src/lib/analytics.ts`. Page view per route + events `add_to_cart`, `begin_checkout`, `order_placed`, `payment_completed`, `review_submitted`, `workshop_video_play`. GA waits for cookie consent (banner); Plausible is cookieless |

Orders and reviews are rate-limited per IP. Behind nginx or a hosting proxy set `TRUST_PROXY` so the real IP is seen. Existing databases get the new columns and the `reviews` table automatically when the API starts.

## What is real and what is a placeholder

| Item | Status | Replace with |
|---|---|---|
| **Intro film** | ⚠️ Placeholder: real-time 3D shots of the guembri, labelled on screen | Maâlem footage: add files under `public/videos/` and list them in `INTRO_VIDEOS` (`src/data/media.ts`) |
| **Editorial photos** | ⚠️ "Lila" and "festival stage" slots say "Photograph to be supplied". The other two are renders of this site's 3D model, captioned as renders | Licensed photos (with participants' consent for ritual images). Set `src` in `EDITORIAL` |
| **Guembri audio** | ⚠️ Original synthesized study tones, labelled in the UI | Recorded samples: `public/audio/guembri/` + `manifest.json` (see `manifest.example.json`) |
| **Catalogue** | ⚠️ Demo products, prices and stock (`is_demo = 1`), shown as "Demo catalogue". Unknown specs read "To be confirmed by the maker" | The real catalogue in `server/seed.ts` or directly in MySQL |
| **Product images** | Renders of the procedural guembri and qraqeb models. Accessories and clothing show a "Product photograph to be supplied" placeholder | Product photography (`products.image`) |
| **3D models** | The qraqeb and the accessories (strings, bindings, cap, bag) are built in code (`src/three/Qraqeb.tsx`, `src/three/Accessories.tsx`); the linen tunic has no model yet and shows a labelled illustration. The guembri (Page 3, showroom, product page) is a Blender GLB (`public/models/guembri.glb`), generated by `scripts/blender/build-guembri.py` | Rebuild: `blender --background --factory-startup --python scripts/blender/build-guembri.py -- public/models/guembri.glb` |
| **Facts** | Only claims backed by linked sources: UNESCO's 2019 inscription of Gnawa and the official Essaouira festival site | Have a Gnawa practitioner review the copy before launch |

Regenerating renders after changing a model: run `npm run dev` and open `/render/guembri-hero` (also `guembri-strings`, `guembri-sersera`, `qraqeb`, `qraqeb-detail`). This dev-only page frames each shot for a screenshot into `public/images/renders/`.

## Structure

```
shared/schemas.ts          types + Zod validation used by both sides
server/                    Express API, MySQL pool, schema.sql, seed.ts
src/pages/Experience.tsx   the four sections as one scroll-driven page
src/sections/intro|ritual|guembri|portal/
src/pages/store/           store, product, cart, checkout, order
src/three/                 guembri, strings, markers, qraqeb, product viewer, textures
src/components/            nav, cart drawer, curtain transitions, figures, ornaments
src/audio/                 Web Audio engine + demo scheduler
src/lib/                   smooth scroll, API client, device helpers
```

`_antigravity_backup/` holds files another tool wrote into this project while it was being built. They are not used and can be deleted.
