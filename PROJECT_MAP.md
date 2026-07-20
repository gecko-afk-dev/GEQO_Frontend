# PROJECT_MAP — GEQO Platform (Master Reference)

**Purpose:** Token-efficient map of the full GEQO WhatsApp-first ordering platform. Use this file (with `@PROJECT_MAP.md`) in future prompts instead of re-scanning repos.

**Last scanned:** 2026-07-19  
**Sources:** `ARCHITECTURE.md`, full repo tree + key file reads across all three workspaces.

---

## 1. Ecosystem Overview

| Repo | Local path | Role | Stack |
|------|------------|------|-------|
| **Backend API** | `c:\Users\pc\geqo\whatsapp_ordering` | WhatsApp webhooks, flows, orders, auth, multi-tenant DB | FastAPI, SQLAlchemy 2 (async), PostgreSQL, AsyncPG |
| **Admin Dashboard** | `c:\Users\pc\Documents\GitHub\GEQO_Frontend` | Restaurant/super-admin SPA (KDS, menu, staff, analytics) | Vue 3 (CDN ESM), Axios, Tailwind CDN, PWA |
| **Marketing Site** | `c:\Users\pc\geqo marketing_site\geqo-marketing-site` | Public landing + beta invite claim form | Next.js 15, React 19, Tailwind 4, i18n (en/fr/ar) |

### Production URLs

| Service | URL |
|---------|-----|
| API | `https://api.mygeqo.com` |
| Admin dashboard | `https://app.mygeqo.com` |
| Marketing | `https://mygeqo.com` / `https://www.mygeqo.com` |
| Local API | `http://localhost:8000` |
| Local dashboard | served as static files (often via backend or local static server) |
| Local marketing | `http://localhost:3000` (Next.js dev) |

### High-level flow

```
Customer (WhatsApp) → Meta Cloud API → webhook.py / flow_handler.py
                                              ↓
                                         PostgreSQL (multi-tenant)
                                              ↓
                    socket_manager.py ← order_service.py
                         ↓ WebSocket
              GEQO_Frontend (KitchenMonitor / OrdersManager)
                         ↑ REST (cookie JWT)
              Admin users (owners, cashiers, kitchen_staff, admin)

Marketing site (/claim) → POST /api/v1/public/beta-signup → beta.py → email + BetaCard/BetaSignup tables
```

---

## 2. Backend — `whatsapp_ordering`

### Root files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Postgres + FastAPI app + Caddy (443/80). DB not exposed externally. |
| `Dockerfile` | Production Python image |
| `Caddyfile` | HTTPS reverse proxy (required for Meta webhooks) |
| `requirements.txt` | Python deps |
| `README.md` | Setup, env vars, API table |
| `.env.example` | WhatsApp, DB, SMTP, feature flags |
| `create_admin.py` | Standalone admin creation script |
| `migrate_roles.py` | Role migration utility |
| `seed_beta_cards.py` | Beta card batch seeding |
| `app/seed_admin.py` | In-container admin seeder (`python -m app.seed_admin`) |
| `app/seed_trilingual.py` | Sample restaurant + trilingual menu |
| `app/sign_flow.py` | WhatsApp Flow signing helper |
| `test_endpoint.py` / `test_endpoint.ps1` | Manual endpoint tests |
| `SECURITY_FIXES_REPORT.md` | Security audit notes (WebSocket subprotocol auth, etc.) |
| `.github/workflows/security.yml` | CI security checks |

### `app/main.py` — Router registration

| Prefix | Module | Purpose |
|--------|--------|---------|
| `/api/v1` | `webhook.py` | WhatsApp GET verify + POST messages |
| `/api/v1/dashboard` | `dashboard.py` | Orders REST + WebSocket KDS feed |
| `/api/v1/flow` | `flow_handler.py` | Meta Flow encrypted data exchange |
| `/api/v1/admin` | `admin.py` | Login, analytics, restaurants, staff, audit |
| `/api/v1/admin/menu` | `menu.py` | Categories, items, modifiers |
| `/api/v1/admin/drivers` | `drivers.py` | Delivery driver CRUD |
| `/api/v1/auth` | `auth.py` | Password reset / setup / force-change |
| `/api/v1/public` | `beta.py` | Public beta signup (rate-limited) |

CORS hardcoded for: `localhost:8000/5173/3000`, `app.mygeqo.com`, `mygeqo.com`, `www.mygeqo.com`.

### `app/core/`

| File | Purpose |
|------|---------|
| `config.py` | Pydantic Settings from `.env` (fail-fast). Feature flags: `FEATURE_OVERVIEW_ENABLED`, `FEATURE_STAFF_ENABLED`, `FEATURE_DRIVERS_ENABLED`, `FEATURE_AUDIT_LOGS_ENABLED` |
| `database.py` | Async SQLAlchemy engine + `AsyncSessionLocal` |
| `auth.py` | JWT (HS256, 30 min), bcrypt passwords. Auth via Bearer header **or** `access_token` httpOnly cookie. Role guards: `get_current_admin`, `get_current_owner`, etc. |

### `app/models.py` — Key entities (16 tables)

**Enums:** `OrderStatus`, `FulfillmentMethod`, `UserRole`, `RestaurantStatus`, `PaymentStatus`, `BetaCardStatus`

**Tables:** `User`, `Restaurant`, `Customer`, `Category`, `MenuItem`, `ModifierGroup`, `ModifierOption`, `Order`, `OrderItem`, `OrderItemExclusion`, `OrderItemModifier`, `Driver`, `Cart`, `CartItem`, `CartItemExclusion`, `CartItemModifier`, `DailyAnalytics`, `AuditLog`, `BetaCard`, `BetaSignup`

**Roles:** `admin`, `restaurant_owner`, `cashier`, `kitchen_staff`

### `app/api/` — Endpoints (summary)

**admin.py**
- `POST /admin/login` — Sets httpOnly `access_token` cookie; returns `user` object + `feature_flags` (no token in body)
- `POST /admin/logout` — Clears cookie
- `POST /admin/setup-admin` — Bootstrap admin (requires `SETUP_BOOTSTRAP_TOKEN` + `X-Setup-Token` header)
- `GET /admin/analytics/summary` — Super-admin metrics
- `GET /admin/analytics/restaurants` — Per-restaurant analytics
- `GET|POST /admin/restaurants`, `PUT /admin/restaurants/{id}`, `POST .../suspend`, `POST .../activate`
- `GET /admin/restaurant/dashboard` — Owner/cashier dashboard stats
- `POST /admin/restaurant/items/{item_id}/toggle` — Quick availability toggle
- `GET /admin/staff`, `POST /admin/staff/invite`, `POST /admin/staff/{id}/toggle`, `DELETE /admin/staff/{id}`
- `GET /admin/audit-log?limit=&offset=`

**dashboard.py**
- `GET /dashboard/orders/{restaurant_id}` — Active orders
- `POST /dashboard/orders/{order_id}/status` — `{ new_status, driver_id? }`
- `POST /dashboard/items/{item_id}/toggle-availability`
- `WS /dashboard/ws/{restaurant_id}` — JWT via `Sec-WebSocket-Protocol: bearer.{token}`

**menu.py** — `GET /{restaurant_id}`, CRUD categories/items, modifier groups/options

**drivers.py** — `GET|POST /`, `DELETE /{driver_id}` (mounted at `/api/v1/admin/drivers`)

**auth.py** — `forgot-password`, `reset-password`, `setup-password`, `force-change-password`

**webhook.py** — Meta signature verification (HMAC SHA256), message routing, cart/order lifecycle, pushes WebSocket events

**flow_handler.py** — `POST /flow-endpoint` — AES encryption for WhatsApp Flows (menu, delivery PIN)

**beta.py** — `POST /public/beta-signup` — Validates `GEQO-XXXXXX` card codes, rate limit 5/min/IP, sends confirmation + admin notification emails

### `app/services/`

| File | Purpose |
|------|---------|
| `whatsapp.py` | WhatsApp Cloud API client (text, buttons, location, flows) |
| `order_service.py` | Cart processing, delivery PIN, order notifications |
| `socket_manager.py` | Per-restaurant WebSocket fan-out (`NEW_ORDER`, `ORDER_STATUS_UPDATED`) |
| `email.py` | SMTP (Lark Suite) — password reset, beta confirmation, admin signup alerts |

### `app/templates/email/`

- `beta_confirmation.html`, `admin_new_signup.html`

---

## 3. Frontend — `GEQO_Frontend`

Lightweight Vue 3 SPA — **no bundler**; runtime via CDN. Dev tooling only (ESLint, Prettier).

### File tree

```
static/
  index.html          # SPA entry, Tailwind config (Maghreb charcoal/saffron theme), PWA meta
  setup.html          # DISABLED — points to SETUP_BOOTSTRAP_TOKEN + /admin/setup-admin
  manifest.json       # PWA manifest (icons at /static/icon-192.png, icon-512.png)
  sw.js               # Service worker (cache-first local, network-first /api)
  css/index.css       # Design tokens, animations, component classes
  js/
    app.js            # Root Vue app, auth gate, password reset routes
    api.js            # Axios client → ${backendURL}/api/v1, withCredentials=true
    views/
      Login.js
      Dashboard.js    # Shell: nav, RBAC routing, feature-flag locks (NOT in ARCHITECTURE.md)
      Overview.js
      KitchenMonitor.js   # KDS — full-screen for kitchen_staff
      OrdersManager.js
      MenuManager.js
      StaffManager.js
      DriversManager.js
      RestaurantsAdmin.js
      AuditLog.js
      ResetPassword.js
      ForcePasswordChange.js
package.json          # lint/format scripts only
.eslintrc.json
.pre-commit-config.yaml
.github/workflows/frontend-quality.yml   # ESLint on push/PR to main
```

### Auth model (important)

- **REST:** Backend sets httpOnly `access_token` cookie on login. Axios uses `withCredentials: true`.
- **Login.js** emits `user` only — does **not** write `localStorage`.
- **app.js** `checkAuth()` requires **both** `localStorage.token` and `localStorage.user` → page refresh may show login even with valid cookie.
- **WebSocket:** KitchenMonitor + OrdersManager read `localStorage.getItem('token')` and pass `bearer.{token}` subprotocol — **token is never set in current login flow** → real-time KDS may fail until auth storage is aligned.

### RBAC & navigation (`Dashboard.js`)

| Role | Default view | Access |
|------|--------------|--------|
| `kitchen_staff` | KitchenMonitor (full screen, no header/nav) | KDS only |
| `admin` | Overview | All nav items; Restaurants Admin |
| `restaurant_owner` | Overview or Orders (if overview locked) | Menu, Orders, Staff*, Drivers*, Audit* |
| `cashier` | Same as owner minus Staff | Menu, Orders, Drivers* |

*Gated by server `feature_flags` from login response. Locked features show toast; admin bypasses all flags.

### Frontend → API mapping

| View | Endpoints (relative to `/api/v1`) |
|------|-----------------------------------|
| Login | `POST /admin/login`, `POST /auth/forgot-password` |
| app.js | `POST /admin/logout` |
| ResetPassword | `POST /auth/reset-password` or `/auth/setup-password` |
| ForcePasswordChange | `POST /auth/force-change-password` |
| Overview | `GET /admin/analytics/summary` (admin) or `GET /admin/restaurant/dashboard` (owner/cashier) |
| KitchenMonitor | `GET /dashboard/orders/{restaurant_id}`, `POST /dashboard/orders/{id}/status`, `GET /drivers` ⚠️, `WS /dashboard/ws/{restaurant_id}` |
| OrdersManager | Same orders endpoints + WebSocket |
| MenuManager | `GET /admin/menu/{restaurant_id}`, CRUD categories/items via `/admin/menu/...` |
| StaffManager | `GET /admin/staff`, `POST /admin/staff/invite`, `POST /admin/staff/{id}/toggle`, `DELETE /admin/staff/{id}` |
| DriversManager | `GET|POST /admin/drivers`, `DELETE /admin/drivers/{id}` |
| RestaurantsAdmin | `GET|POST /admin/restaurants`, `PUT /admin/restaurants/{id}`, suspend/activate |
| AuditLog | `GET /admin/audit-log?limit=&offset=` |

⚠️ **Bug:** KitchenMonitor calls `GET /drivers` but backend mounts drivers at `/admin/drivers`. DriversManager uses the correct path.

### WebSocket events

- URL: `ws(s)://{host}/api/v1/dashboard/ws/{restaurant_id}`
- Auth: subprotocol `bearer.{jwt}`
- Events handled: `NEW_ORDER`, `ORDER_STATUS_UPDATED` → reload orders
- Reconnect: 3s backoff on close

### Runtime dependencies (CDN in index.html)

Vue 3 ESM, Axios, Tailwind CDN, Google Fonts (Plus Jakarta Sans + Cairo)

---

## 4. Marketing Site — `geqo-marketing-site`

**App root:** `tailwind-landing-page-template-main/tailwind-landing-page-template-main/` (nested template folder)

### Stack

Next.js 15 (App Router), React 19, Tailwind 4, TypeScript, pnpm

### Key routes & components

| Path | File | Purpose |
|------|------|---------|
| `/` | `app/(default)/page.tsx` | Main landing |
| `/claim` | `app/(default)/claim/page.tsx` | Beta invite claim page |
| `/api/v1/public/beta-signup` | `app/api/v1/public/beta-signup/route.ts` | Server-side proxy to backend (forwards CF IP headers) |

**Components:** `hero-home`, `pain-relief`, `how-it-works`, `signup-form`, `success-overlay`, `banner`, `accordion`, `ui/header`, `ui/footer`, `ui/logo`

**i18n:** `lib/i18n/` — `translations.ts`, `i18n-context.tsx`, `use-translation.ts` (en/fr/ar)

### Beta signup flow

1. User visits `/claim?card=GEQO-XXXXXX` (optional prefill)
2. `signup-form.tsx` → `POST ${API_BASE}/api/v1/public/beta-signup` with `{ manager_name, restaurant_name, email, whatsapp_number, card_code, locale }`
3. Local dev: `NEXT_PUBLIC_API_URL` or `http://localhost:8000`
4. Production: same-origin `/api/...` via Next.js route handler → `https://api.mygeqo.com/api/v1/public/beta-signup`

---

## 5. Cross-repo conventions

### API base path

All authenticated dashboard calls: `/api/v1/...`

### Order status lifecycle

`pending → received → accepted → preparing → ready → dispatched → delivered` (or `cancelled`)

### Feature flags (backend `.env` → login `feature_flags`)

Default in `.env.example`: all `false` except orders/menu always enabled in UI for non-admin.

### Security notes (from codebase)

- Webhook: HMAC signature required (`WHATSAPP_APP_SECRET`)
- Flow endpoint: AES encrypted payloads
- JWT in WebSocket URL removed — uses subprotocol instead
- Admin setup: disabled in UI (`setup.html`); use env token + API
- Rate limiters in webhook + beta are in-memory (not Redis) — single-instance only

---

## 6. Dev quick reference

```bash
# Backend (Docker)
cd c:\Users\pc\geqo\whatsapp_ordering
cp .env.example .env   # edit credentials
docker compose up -d --build

# Backend (local)
uvicorn app.main:app --reload

# Frontend lint
cd c:\Users\pc\Documents\GitHub\GEQO_Frontend
npm install && npm run lint

# Marketing site
cd "c:\Users\pc\geqo marketing_site\geqo-marketing-site\tailwind-landing-page-template-main\tailwind-landing-page-template-main"
pnpm install && pnpm dev
```

---

## 7. Gaps vs ARCHITECTURE.md (corrected/added)

| Item | ARCHITECTURE.md | Actual |
|------|-----------------|--------|
| `Dashboard.js` | Missing | Shell component with RBAC + feature flags |
| `setup.html` | Onboarding page | Disabled security notice |
| `beta.py` + marketing site | Missing | Full beta signup pipeline |
| User roles | admin, owner | + `cashier`, `kitchen_staff` |
| Drivers API path | `/drivers` implied | `/admin/drivers` |
| Auth | JWT in localStorage | httpOnly cookie for REST; localStorage token unused |
| Third repo | Not documented | Marketing site (Next.js) |
| Email templates | Mentioned generically | `app/templates/email/` |
| CI | Not mentioned | Frontend ESLint + backend security workflow |

---

## 8. Prompt usage

For future tasks, reference:

```
@PROJECT_MAP.md — [specific area: backend webhook | KDS | menu CRUD | beta signup | auth fix]
```

Narrow scope to one repo section above before opening files. Only read source when changing behavior or debugging.

---

*Generated from full scan of three workspaces + ARCHITECTURE.md. Update this file when adding routers, views, or new repos.*
