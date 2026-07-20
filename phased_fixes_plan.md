# Implementation Plan — GEQO Auth & KDS Fixes

Three confirmed bugs block core dashboard behavior, plus a few related gaps found while tracing the code. This plan fixes them in phases so you can ship quick wins first, then align auth on a single **cookie-first** model (matching the backend security direction in `SECURITY_FIXES_REPORT.md`).

---

## Goals

1. **Session persists** across page refresh (login state restored without re-entering credentials).
2. **WebSocket KDS works** in production (`app.mygeqo.com` → `api.mygeqo.com`).
3. **Driver list loads** in Kitchen Monitor for dispatch.
4. **No JWT in localStorage** — httpOnly cookie remains the source of truth for REST; WebSocket uses the same cookie where possible.
5. **Local dev** remains workable (HTTP localhost without broken `Secure` cookies).

---

## Issue Inventory

| # | Issue | Severity | Symptom |
|---|--------|----------|---------|
| 1 | **Session not restored on refresh** | Critical | `app.js` requires `localStorage.token` + `localStorage.user`, but login never writes either |
| 2 | **WebSocket auth broken** | Critical | KDS/Orders open WS with `localStorage.token` → always `bearer.null` |
| 3 | **Wrong drivers endpoint** | High | `KitchenMonitor.js` calls `GET /drivers`; backend is `GET /admin/drivers` |
| 4 | **Missing `api` import in `app.js`** | High | Logout calls `api.post(...)` without importing `api` → runtime error |
| 5 | **`Secure=True` cookie on HTTP localhost** | Medium | Login cookie may not be set/stored in local dev |
| 6 | **Drivers RBAC too strict for KDS** | Medium | `list_drivers` allows only `restaurant_owner` / `admin`; kitchen/cashier get 403 even after path fix |
| 7 | **Dead localStorage cleanup code** | Low | `api.js` 401 handler clears `localStorage` keys that are never set |

---

## Recommended Architecture

```
Login POST /admin/login
    → backend sets httpOnly access_token cookie
    → frontend stores user profile only (sessionStorage, optional)

Page load GET /admin/me  (cookie auth)
    → returns user object → mount Dashboard

REST calls (Axios, withCredentials: true)
    → cookie sent automatically

WebSocket wss://api.mygeqo.com/.../ws/{id}
    → browser sends cookie on handshake
    → backend reads websocket.cookies["access_token"]
    → no JWT in JS memory or localStorage
```

**Why not return JWT in login body?** It would fix WS quickly but reverses the httpOnly cookie migration and re-exposes tokens to XSS.

**Local dev fallback:** When cookie cross-origin fails (e.g. frontend on `:5500`, API on `:8000`), keep subprotocol auth as a **dev-only fallback** via a short-lived `GET /admin/ws-token` endpoint (cookie-authenticated, returns token valid ~60s).

---

## Phase 0 — Quick Fixes (≈30 min, low risk)

Ship independently; no auth redesign required.

### 0.1 Fix drivers path in Kitchen Monitor

**File:** `GEQO_Frontend/static/js/views/KitchenMonitor.js`

```javascript
// Before
api.get('/drivers')
// After
api.get('/admin/drivers')
```

### 0.2 Fix missing import in app root

**File:** `GEQO_Frontend/static/js/app.js`

```javascript
import { api } from './api.js';
```

### 0.3 Verify

- Login → open Kitchen Monitor → driver dropdown populates (with `FEATURE_DRIVERS_ENABLED=true` and owner role).
- Logout button no longer throws `ReferenceError: api is not defined`.

---

## Phase 1 — Session Restore (≈2–3 hours)

Fixes refresh logout without touching WebSocket yet.

### 1.1 Backend: add `GET /admin/me`

**File:** `whatsapp_ordering/app/api/admin.py`

- New endpoint: `GET /admin/me`
- Auth: `Depends(get_current_user)`
- Response: same `user` dict shape as login (id, email, role, restaurant_id, requires_password_change, feature_flags)
- Reuse feature-flag logic from login (extract small helper to avoid duplication)

### 1.2 Frontend: rewrite `checkAuth`

**File:** `GEQO_Frontend/static/js/app.js`

Replace localStorage gate with:

```javascript
const checkAuth = async () => {
  try {
    const res = await api.get('/admin/me');
    user.value = res.data;
    sessionStorage.setItem('user', JSON.stringify(res.data)); // optional cache
  } catch {
    user.value = null;
    sessionStorage.removeItem('user');
  } finally {
    loading.value = false;
  }
};
```

### 1.3 Frontend: persist user on login

**File:** `GEQO_Frontend/static/js/views/Login.js` (or `handleLogin` in `app.js`)

After successful login:

```javascript
sessionStorage.setItem('user', JSON.stringify(user));
```

Do **not** store token.

### 1.4 Frontend: clear session on logout

**Files:** `app.js`, `api.js`

- Logout: clear `sessionStorage.user` after `POST /admin/logout`
- 401 interceptor: remove `localStorage` references; clear `sessionStorage.user` only

### 1.5 Verify

- Login → refresh page → still authenticated
- Expired session (wait 30 min or delete cookie) → redirected to login
- Force-password-change flow still works

---

## Phase 2 — WebSocket Cookie Auth (≈2–3 hours)

Fixes real-time KDS without localStorage tokens.

### 2.1 Backend: accept cookie OR subprotocol on WebSocket

**File:** `whatsapp_ordering/app/api/dashboard.py`

Update `websocket_endpoint`:

1. Try `websocket.cookies.get("access_token")`
2. Else fall back to `Sec-WebSocket-Protocol: bearer.{token}` (backward compat / dev)
3. Validate token → user → restaurant access (existing logic)

### 2.2 Frontend: simplify WebSocket connection

**Files:** `KitchenMonitor.js`, `OrdersManager.js`

Extract shared helper (new file recommended):

**`GEQO_Frontend/static/js/ws.js`**

```javascript
export function createDashboardSocket(restaurantId) {
  const isLocal = ...;
  const wsUrl = `${protocol}//${wsHost}/api/v1/dashboard/ws/${restaurantId}`;
  return new WebSocket(wsUrl); // cookie sent automatically in prod
}
```

Remove:

```javascript
const token = localStorage.getItem('token');
new WebSocket(wsUrl, [`bearer.${token}`]);
```

Add guard: if `ws.onclose` with code 4001, show "Reconnecting…" (existing 3s backoff is fine).

### 2.3 Local dev fallback (optional but recommended)

**Backend:** `GET /admin/ws-token` — requires cookie auth, returns `{ token, expires_in: 60 }`

**Frontend `ws.js`:** if `isLocal && !document.cookie.includes('access_token')`, fetch ws-token first, then connect with subprotocol.

### 2.4 Verify

- Production: new order appears on KDS without manual refresh
- `ORDER_STATUS_UPDATED` triggers reload in Orders Manager
- WebSocket reconnects after network blip
- No JWT visible in DevTools → Application → Local Storage

---

## Phase 3 — Cookie & Dev Environment Hardening (≈1 hour)

### 3.1 Environment-aware cookie flags

**File:** `whatsapp_ordering/app/core/config.py`

```python
COOKIE_SECURE: bool = True  # default prod
ENVIRONMENT: str = "production"  # or infer from DEBUG
```

**File:** `whatsapp_ordering/app/api/admin.py`

```python
secure=settings.COOKIE_SECURE,
samesite="lax" if not settings.COOKIE_SECURE else "strict",
```

**`.env.example`:** document `COOKIE_SECURE=false` for local HTTP.

### 3.2 Document local dev setup

**Recommended:** serve frontend from the same origin as the API (e.g. FastAPI static mount or Caddy serving both) so cookies work without fallbacks.

Update `PROJECT_MAP.md` dev section with:

- Same-origin setup (preferred)
- Cross-origin fallback via ws-token endpoint

---

## Phase 4 — Drivers RBAC for KDS (≈1 hour, if dispatch from kitchen is required)

Path fix alone is not enough for `kitchen_staff` / `cashier`.

### 4.1 Backend: read-only drivers list for kitchen/cashier

**File:** `whatsapp_ordering/app/api/drivers.py`

Change `list_drivers` dependency from `get_manager_or_admin` to `get_current_kitchen_or_above`:

- **GET /** — read for kitchen_staff, cashier, owner, admin
- **POST / DELETE** — keep `get_manager_or_admin` (owner/admin only)

Respect `FEATURE_DRIVERS_ENABLED` as today.

### 4.2 Verify

- Log in as `kitchen_staff` → KDS loads drivers for dispatch UI
- Kitchen staff cannot POST/DELETE drivers via API (403)

---

## Phase 5 — Cleanup & Docs (≈30 min)

| Task | File |
|------|------|
| Remove all `localStorage.token` / `localStorage.user` references | `app.js`, `api.js`, views |
| Update `PROJECT_MAP.md` auth section | `GEQO_Frontend/PROJECT_MAP.md` |
| Add `/admin/me` to README API table | `whatsapp_ordering/README.md` |
| Note WS cookie auth in security report | optional |

---

## Suggested PR Split

| PR | Scope | Risk |
|----|--------|------|
| **PR 1** | Phase 0 (drivers path + api import) | Very low |
| **PR 2** | Phase 1 (`/admin/me` + session restore) | Low |
| **PR 3** | Phase 2 (WebSocket cookie auth + ws helper) | Medium — test in staging |
| **PR 4** | Phase 3 + 4 (cookie env, drivers RBAC) | Low |
| **PR 5** | Phase 5 (cleanup + docs) | None |

---

## Test Plan

### Manual checklist

- [ ] Login as `admin`, `restaurant_owner`, `cashier`, `kitchen_staff`
- [ ] Refresh page — session persists for each role
- [ ] Logout — cookie cleared, redirected to login
- [ ] KDS: place test order via WhatsApp/webhook — appears live
- [ ] KDS: status transition → WS event → UI updates
- [ ] KDS: driver assignment dropdown populated (feature flag on)
- [ ] 401 from expired session → single redirect, no infinite loop
- [ ] Local dev: login + WS works with documented setup

### Regression areas

- Password reset / setup token URL flows (`ResetPassword.js`)
- Force password change (`ForcePasswordChange.js` — uses cookie auth already)
- Feature flags still gate nav items correctly after `/admin/me`

---

## Out of Scope (follow-ups)

These came up during analysis but are separate from the three original bugs:

- **kitchen_staff status updates:** `POST /dashboard/orders/{id}/status` requires `cashier_or_above`; kitchen may be blocked from marking orders ready — confirm product intent before changing.
- **Cross-subdomain cookie domain attribute:** only needed if you move to `.mygeqo.com` shared cookies.
- **Redis rate limiters / session store:** production scaling, not auth correctness.

---

## Effort Summary

| Phase | Time | Blocks |
|-------|------|--------|
| 0 — Quick fixes | ~30 min | — |
| 1 — Session restore | ~2–3 h | Phase 0 optional |
| 2 — WebSocket cookies | ~2–3 h | Phase 1 |
| 3 — Dev cookie flags | ~1 h | Phase 1 |
| 4 — Drivers RBAC | ~1 h | Phase 0 |
| 5 — Cleanup | ~30 min | All above |

**Total:** ~1–1.5 days for one developer, including staging verification.
