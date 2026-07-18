PROJECT_MAP — GEQO_Frontend

Purpose
- Frontend admin/dashboard for the GEQO WhatsApp-first ordering platform. Provides restaurant and super-admin UX for: login and RBAC, menu & staff management, order monitoring (KDS), driver management, audit logs, and tenant onboarding (setup). Designed as a lightweight SPA (Vue 3 via CDN) with PWA support.

Primary sources used
- ARCHITECTURE.md (reference, c:\Users\pc\Downloads\ARCHITECTURE.md)
- Inspected files in this repo: package.json, static/index.html, static/js/api.js, static/js/app.js and the static/js/views/ folder.

Main folders & important files
- static/
  - index.html — SPA entry point, loads fonts, Tailwind CDN, Axios, and mounts /js/app.js. Registers PWA manifest and icons.
  - setup.html — Onboarding page for new restaurant tenants.
  - sw.js — Service worker for PWA capabilities.
  - manifest.json — PWA metadata (name, icons, display).
  - css/index.css — Main styles (Tailwind customization / tokens).
  - icon-192.png, icon-512.png — App icons.
  - js/
    - app.js — Vue application root, authentication state, route / view selection and lifecycle hooks.
    - api.js — Axios instance (baseURL selection, response interceptors for 401/500 and network errors). Uses withCredentials = true.
    - views/ — Page components (vanilla JS Vue components): Login.js, Overview.js, Dashboard.js, KitchenMonitor.js, OrdersManager.js, MenuManager.js, StaffManager.js, DriversManager.js, RestaurantsAdmin.js, AuditLog.js, ResetPassword.js, ForcePasswordChange.js
- package.json — dev tooling (eslint, prettier) and scripts for lint/format.
- .eslintrc.json, .pre-commit-config.yaml, .github/workflows/frontend-quality.yml — quality and CI hints.

Key modules & responsibilities
- app.js
  - Root Vue app. Manages client auth state (reads/writes localStorage token & user), login/logout flows, password reset/setup flows and mounts page components.
- api.js
  - Creates axios client with dynamic backendURL (localhost vs production) and base path: `${backendURL}/api/v1`.
  - Handles response interceptor: clears localStorage and redirects to login on 401; alerts on server or network errors. withCredentials=true indicates cookie usage for auth as well.
- Views (static/js/views/*.js)
  - Each file implements a single page: Login, Dashboard, KitchenMonitor (real-time KDS), OrdersManager, MenuManager, StaffManager, DriversManager, RestaurantsAdmin (multi-tenant admin), AuditLog, password workflows.
- PWA assets (sw.js, manifest.json)
  - Enable installable dashboard on tablets/phones and offline caching behaviors required for kiosk/tablet deployments.

Data flow (high level)
- Browser loads static/index.html -> loads Tailwind, fonts, Axios, then mounts /js/app.js (module).
- app.js reads localStorage for token/user and chooses view: Login -> Dashboard. The app favors cookie-based auth (api.js sets withCredentials=true) while some views also read a token from localStorage when opening WebSockets.
- API interactions: api.js axios client -> backend at `${backendURL}/api/v1` (http://localhost:8000 for local development; production URL is https://api.mygeqo.com). Axios is configured with withCredentials and a global 401 handler that clears local storage and redirects to login.

Concrete endpoints used by inspected views
- Login.js
  - POST /admin/login  -- payload: { email, password }. Response consumed for user object. (Login.js emits the user but does not store token in localStorage; server likely sets an http-only session cookie.)
  - POST /auth/forgot-password -- payload: { email } (sends reset link message)

- KitchenMonitor.js (KDS)
  - GET  /api/v1/dashboard/orders/:restaurant_id  -- returns active orders for the restaurant (view calls api.get('/dashboard/orders/' + restaurant_id)).
  - POST /api/v1/dashboard/orders/{order_id}/status  -- body: { new_status: string, driver_id?: id } used to change order status.
  - GET  /api/v1/drivers  -- returns available drivers (view calls api.get('/drivers')).
  - WebSocket (real-time)
    - Local:  ws://localhost:8000/api/v1/dashboard/ws/{restaurant_id}
    - Prod:   wss://api.mygeqo.com/api/v1/dashboard/ws/{restaurant_id}
    - The client opens the socket with new WebSocket(wsUrl, [`bearer.${token}`]) where token is read from localStorage (if present). The socket listens for events such as NEW_ORDER and ORDER_STATUS_UPDATED and triggers loadOrders() on those events. The client reconnects after close with a 3s backoff.

- OrdersManager.js
  - GET  /api/v1/dashboard/orders/:restaurant_id  -- fetch active orders for the restaurant (same endpoint as KDS; view uses api.get('/dashboard/orders/' + restaurant_id)).
  - POST /api/v1/dashboard/orders/{order_id}/status  -- body: { new_status: string } used to transition orders (accept, preparing, ready, cancelled, delivered). Client performs optimistic UI updates and may remove terminal-state orders locally.
  - WebSocket (real-time), same URL as KitchenMonitor: the orders view opens ws://.../api/v1/dashboard/ws/{restaurant_id} (or wss://... in prod) using the `bearer.{token}` subprotocol and listens for NEW_ORDER and ORDER_STATUS_UPDATED to trigger a reload.

- MenuManager.js
  - GET   /api/v1/admin/menu/:restaurant_id         -- load category + item structure for the restaurant (api.get('/admin/menu/' + restaurant_id)).
  - PATCH /api/v1/admin/menu/items/{item_id}        -- update item fields: used for price edits and availability toggles (payloads shown in code: { price } and { is_available }).
  - POST  /api/v1/admin/menu/categories             -- create category (payload includes name_en, name_fr, name_ar, restaurant_id).
  - DELETE /api/v1/admin/menu/categories/{id}      -- delete category (cascades items server-side).
  - POST  /api/v1/admin/menu/items                  -- create new item (payload includes name, price, category_id, restaurant_id, etc.).
  - DELETE /api/v1/admin/menu/items/{id}           -- delete an item.

- Dashboard / Overview (composition)
  - Overview.js
    - Admin: GET /api/v1/admin/analytics/summary      -- returns admin-level metrics (adminStats).
    - Owner/Cashier: GET /api/v1/admin/restaurant/dashboard  -- returns owner-specific dashboard data (today_stats, revenue, orders).
  - Dashboard.js itself is a navigator that composes Overview, OrdersManager, MenuManager, KitchenMonitor and other admin pages; API surface is exposed by those child components.

- Other notes on data flow
  - The frontend primarily talks to the API under /api/v1. Some endpoints are called relative to that base (api.js baseURL = `${backendURL}/api/v1`), meaning view code typically uses paths like '/dashboard/orders/...' or '/drivers'.
  - Authentication appears to be handled either via http-only cookies (withCredentials) or via a token stored in localStorage used for WebSocket subprotocols; review backend auth implementation for exact expectations.

- PWA: sw.js intercepts network to provide offline/resiliency and allow the app to be installed as a PWA.

Dependencies
- Runtime (loaded via CDN in index.html)
  - Vue 3 (https://unpkg.com/vue@3) — app framework (ESM browser build).
  - Axios (https://unpkg.com/axios/dist/axios.min.js) — HTTP client used by static/js/api.js.
  - Tailwind CDN (https://cdn.tailwindcss.com) — styling utilities and theme customization.
  - Fonts from Google Fonts (Plus Jakarta Sans and Cairo).
- Dev / build tools (package.json — devDependencies)
  - eslint ^8.57.0
  - eslint-plugin-vue ^9.23.0
  - prettier ^3.2.5
- Backend (separate repository)
  - The API and realtime services live in the Backend repository described in ARCHITECTURE.md (FastAPI, SQLAlchemy, AsyncPG, PostgreSQL, socket manager, WhatsApp integration). Frontend expects API under /api/v1 and WebSocket endpoints described in that repo.

Notes & observations
- api.js does not itself attach an Authorization header in the inspected file; authentication state is persisted in localStorage (token, user). Some views / login flow likely add token headers or rely on cookies (withCredentials = true). ARCHITECTURE.md and other frontend files should be consulted if header injection is expected in a specific place.
- package.json contains only devDependencies — runtime libs are delivered via CDNs (no bundler configured in this repo by default).
- The repository is intentionally lightweight (no heavy build step). Linting and formatting scripts exist for developer workflow.

Where to look next (for deeper mapping)
- static/js/views/* (per-file scan to extract exact API endpoints and WebSocket URL usage).
- static/js/Login.js and Dashboard.js to see how tokens are issued/stored and whether axios Authorization headers are set.
- ARCHITECTURE.md (the backend section) for the exact WebSocket endpoint paths (socket_manager) and webhook/Flow details.

Generated from: ARCHITECTURE.md + package.json + static/index.html + static/js/api.js + static/js/app.js (inspected).
