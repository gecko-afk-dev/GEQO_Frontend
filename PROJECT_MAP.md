# PROJECT_MAP — GEQO Platform (Master Reference)

**Purpose:** Token-efficient map of the full GEQO WhatsApp-first ordering platform. Use this file (with `@PROJECT_MAP.md`) in future prompts instead of re-scanning repos.

**Last scanned:** 2026-08-01

---

## 1. Ecosystem Overview (4 Distinct Domains)

| Repo | Local path | Role | Stack |
|------|------------|------|-------|
| **Backend API** | `/Users/hamzamoustaati/Whatsapp-oredering-repo` | WhatsApp webhooks, Magic Links, orders, auth, multi-tenant DB | FastAPI, SQLAlchemy 2 (async), PostgreSQL (Neon), AsyncPG |
| **Admin Dashboard** | `/Users/hamzamoustaati/Desktop/Frontend Repo/GEQO_Frontend` | Restaurant/super-admin SPA (KDS, menu, staff, settings, billing) | Vue 3 (CDN ESM), Axios, Tailwind CDN, PWA |
| **Marketing Site** | `/Users/hamzamoustaati/GEQO Marketing Page/geqo-marketing-site` | Public landing + beta invite claim form | Next.js 15, React 19, Tailwind 4, i18n (en/fr/ar) |
| **Consumer Menu PWA** | `/Users/hamzamoustaati/GEQO_Menu_PWA` | Customer-facing hybrid ordering app (launched via Magic Link) | Next.js 15 (App Router), React 19, Tailwind 4 |

### Production URLs

| Service | URL |
|---------|-----|
| API | `https://api.mygeqo.com` |
| Admin dashboard | `https://app.mygeqo.com` |
| Marketing | `https://mygeqo.com` / `https://www.mygeqo.com` |
| Consumer Menu PWA | `https://menu.mygeqo.com` |

### High-Level Flow (The "Hybrid PWA Funnel")

```text
Customer (WhatsApp) → Meta Cloud API → webhook.py
                                            ↓ Replies with JWT Magic Link (?session=...)
                                     Consumer Menu PWA (menu.mygeqo.com)
                                            ↓ REST (JWT auth) → public_menu.py / public_orders.py
                                       PostgreSQL (Neon)
                                            ↓
                   socket_manager.py ← order_service.py
                        ↓ WebSocket
             GEQO_Frontend (KitchenMonitor / OrdersManager)
                        ↑ REST (cookie JWT)
             Admin users (owners, cashiers, kitchen_staff, admin)
```

*(Note: Consumer WhatsApp Flows are DEAD. `flow_handler.py` ONLY handles the Driver PIN Verification Flow.)*

---

## 2. Backend — `whatsapp_ordering`

### Root files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Postgres + FastAPI app + Caddy (443/80). |
| `Dockerfile` | Production Python image. |
| `requirements.txt` | Python deps. |
| `README.md` | Setup, env vars, API table. |
| `.env.example` | WhatsApp, DB, Resend API key, feature flags. |
| `create_admin.py` | Standalone admin creation script. |
| `migrate_roles.py` | Role migration utility. |
| `seed_beta_cards.py` | Beta card batch seeding. |

### `app/main.py` — Router registration

| Prefix | Module | Purpose |
|--------|--------|---------|
| `/api/v1` | `webhook.py` | WhatsApp GET verify + POST messages (issues Magic Links). |
| `/api/v1/dashboard` | `dashboard.py` | Orders REST + WebSocket KDS feed. |
| `/api/v1/flow` | `flow_handler.py` | Meta Flow (Driver PIN verification ONLY). |
| `/api/v1/admin` | `admin.py` | Login, analytics, restaurants, staff, billing APIs. |
| `/api/v1/admin/menu` | `menu.py` | Categories, items, modifiers. Contains `upload_image_to_cloud` utility. |
| `/api/v1/admin/drivers`| `drivers.py` | Delivery driver CRUD. |
| `/api/v1/auth` | `auth.py` | Password reset / setup / force-change. |
| `/api/v1/public` | `beta.py` | Public beta signup (1-Click Onboarding). |
| `/api/v1/public/menu` | `public_menu.py` | PWA: Fetch restaurant menu data. Returns inherited category images. |
| `/api/v1/public/orders`| `public_orders.py` | PWA: Submit orders (server-side pricing + Haversine geo-math). |

### `app/core/`

| File | Purpose |
|------|---------|
| `config.py` | Pydantic Settings from `.env`. Feature flags. |
| `database.py` | Async SQLAlchemy engine (Neon.tech) + `AsyncSessionLocal`. |
| `auth.py` | JWT (HS256). Auth via Bearer header **or** `access_token` httpOnly cookie. Role guards. |

### `app/models.py` — Key entities (17 tables)

**Enums:** `OrderStatus`, `FulfillmentMethod`, `UserRole`, `RestaurantStatus`, `PaymentStatus`, `BetaCardStatus`, `TransactionType`

**Tables:** `User`, `Restaurant` (Geo-fencing: `latitude`, `longitude`, `max_delivery_radius_km`; Financial: `wallet_balance`), `Customer`, `Category` (`image_url`), `MenuItem` (`image_url`), `ModifierGroup` (Modifier Inheritance: belongs to either `category_id` or `menu_item_id`), `ModifierOption`, `Order` (`delivery_fee`, `customer_notes`, `customer_name`), `OrderItem`, `OrderItemExclusion`, `OrderItemModifier`, `Driver`, `Cart`, `CartItem`, `CartItemExclusion`, `CartItemModifier`, `DailyAnalytics`, `AuditLog` (`detail` as `JSONB`), `BetaCard`, `BetaSignup`, `WalletTransaction`

### `app/api/` — Endpoints (summary)

**admin.py**
- `POST /admin/login` — Sets httpOnly `access_token` cookie; returns `user` + `feature_flags`.
- `POST /admin/logout`
- `GET /admin/analytics/summary`, `GET /admin/analytics/restaurants`, `GET /admin/restaurant/dashboard`
- `GET|POST|PUT /admin/restaurants`, `POST .../suspend`, `POST .../activate`
- `GET /admin/staff`, `POST /admin/staff/invite`, `POST /admin/staff/{id}/toggle`, `DELETE /admin/staff/{id}`
- `GET /admin/audit-log`
- `GET /admin/billing/transactions`, `POST /admin/billing/adjust`

**dashboard.py** — `GET /dashboard/orders/{restaurant_id}`, `POST /dashboard/orders/{order_id}/status`, `WS /dashboard/ws/{restaurant_id}`
**menu.py** — CRUD categories/items, modifier groups/options (Modifier Inheritance logic).
**drivers.py** — Delivery driver management.
**auth.py** — `forgot-password`, `reset-password`, `setup-password`, `force-change-password`.
**beta.py** — 1-Click Beta Onboarding (Validates `GEQO-XXXXXX`, rate limits, sends emails).
**public_menu.py** — Read-only menu fetch for PWA.
**public_orders.py** — PWA cart submission, calculates distances with Haversine formula, validates geo-fencing, server-side price calculation.

### `app/services/`

| File | Purpose |
|------|---------|
| `whatsapp.py` | WhatsApp Cloud API client (text, Magic Links, locations). |
| `order_service.py` | Cart processing, notifications, atomic commission deduction (-3.0 MAD `WalletTransaction` + `wallet_balance` sync). |
| `socket_manager.py` | Per-restaurant WebSocket fan-out (`NEW_ORDER`, `ORDER_STATUS_UPDATED`). |
| `email.py` | Resend HTTP API (bypasses Render SMTP port blocks) — password reset, beta alerts. |
| `audit.py` | Global Audit Logging JSONB utility (`log_audit_action` syncs with parent transaction). |

---

## 3. Admin Dashboard — `GEQO_Frontend` (Vue 3 SPA)

Lightweight Vue 3 SPA (CDN ESM), Tailwind CDN, PWA.

### File tree

```text
static/
  index.html          # SPA entry, Tailwind config (Maghreb charcoal/saffron theme)
  sw.js               # Service worker (cache-first local, network-first /api)
  css/index.css       # Design tokens, animations
  js/
    app.js            # Root Vue app, auth gate, password reset routes
    api.js            # Axios client: withCredentials: true + infinite-loop 401 protection
    views/
      Login.js
      Dashboard.js    # Shell: nav, RBAC routing, feature-flag locks
      Overview.js
      KitchenMonitor.js   # KDS — full-screen for kitchen_staff
      OrdersManager.js
      MenuManager.js      # Base64 File Uploads & "Inherit Category Image" UI
      StaffManager.js
      DriversManager.js   # UI text renamed to 'Delivery Agents'
      RestaurantsAdmin.js # Includes "Adjust Wallet" / Credit capabilities
      RestaurantProfile.js# NEW: Dedicated Admin HQ tabbed interface per-tenant
      AuditLog.js         # Stabilized: JSONB vertical timeline UI, mapped correctly
      Billing.js          # Owner view with Wallet Consumption Bar
      Settings.js         # Profile management + Leaflet.js interactive geo-fencing map
      ResetPassword.js
      ForcePasswordChange.js
```

### Auth model

- **REST:** Backend sets httpOnly `access_token` cookie on login. Axios uses `withCredentials: true`.
- **WebSocket:** KitchenMonitor + OrdersManager read `localStorage.getItem('token')` and pass `bearer.{token}` subprotocol.

### RBAC & navigation (`Dashboard.js`)

| Role | Default view | Access |
|------|--------------|--------|
| `kitchen_staff` | KitchenMonitor | KDS only |
| `admin` | Overview | All nav items; Restaurants Admin; Billing |
| `restaurant_owner` | Overview or Orders | Menu, Orders, Staff*, Drivers*, Audit*, Settings, Billing |
| `cashier` | Same as owner | Menu, Orders, Drivers* |

*\*Gated by server `feature_flags`.*

---

## 4. Consumer Menu PWA — `GEQO_Menu_PWA`

Next.js 15 App Router app serving the customer-facing ordering funnel via Magic Links. Features the "$100M Native App" Aesthetic ("Appetite" design system).

- **Trigger:** Customer messages WhatsApp bot → Bot replies with `https://menu.mygeqo.com/menu/[id]?session=JWT`.
- **Usage:** Customers browse trilingual menu, customize items, and checkout. Caching is disabled (`force-dynamic` via `layout.tsx`) for real-time menu updates.
  - **Native UI/UX:** Uses `vaul` for bottom sheets (Modifier Sheet). The menu layout uses a "$100M App" Horizontal Aesthetic, featuring a "Marhba" greeting, horizontal "Best Seller" cards, and vertical category sections that house native horizontal scroll-snapping item cards. The top category filter pill bar acts as a sticky anchor-nav, powered by an `IntersectionObserver`.
  - **Image Inheritance & Fallbacks:** Items intelligently fall back to their parent Category's image if none is provided, or a Tailwind gradient if no image exists.
  - **Modifiers (Talabat-Style):** Strict enforcement of `min_selection`/`max_selection`. Uses radios for `max=1` and checkboxes for `max>1`. The "Add to Cart" button stays greyed out and unclickable until all required conditions (e.g., "Choose your sauce") are met, and instantly updates its price via `price_override` math.
  - **Map UX (Checkout):** Implements Leaflet pin-drop confirmation to prevent fat-finger mistakes. Features a robust GPS fallback to Casablanca `[33.5731, -7.5898]` if geolocation fails. Failed API submissions now safely alert the backend error message instead of failing silently.
  - **Checkout Payload:** Sends Cart Payload, `customer_name` (via controlled React input), and confirmed map coordinates. Upon success, redirects the user to WhatsApp.
- **Backend Sync:** Submits cart to `POST /api/v1/public/orders/checkout` where server recalculates totals and validates distances using Haversine geo-math against the restaurant's `max_delivery_radius_km`.

---

## 5. Marketing Site — `geqo-marketing-site`

Next.js 15 (App Router), React 19, Tailwind 4.

- `/`: Main landing page.
- `/claim`: Beta invite claim page (`?card=GEQO-XXXXXX`).
- Submits to `POST /api/v1/public/beta-signup` (server-side proxy forwarding CF IP headers to Backend API).
- **i18n:** `lib/i18n/` (en/fr/ar).

---

## 6. Security & Infrastructure Notes

- **Database:** PostgreSQL on Neon.tech.
- **Emails:** Resend HTTP API (avoids Render SMTP blocking).
- **Webhooks:** HMAC SHA256 signature required (`WHATSAPP_APP_SECRET`).
- **Geo-fencing:** Enforced server-side using Haversine formula based on `Restaurant.latitude`/`longitude`.
- **Immutability:** `WalletTransaction` is the source of truth for financial ledgers, synced atomically with `wallet_balance`.
- **Audit Logging:** Global JSONB-backed event logging for operational mutations (orders, menu items, billing, staff).

---

*Generated from full scan of 4 workspaces. Update this file when adding routers, views, or new repos.*
