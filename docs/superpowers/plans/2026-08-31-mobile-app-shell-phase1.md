# Mobile App Shell Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `Dashboard.js`'s single hard-coded chrome into `DesktopChrome` (existing markup, unchanged) and `MobileAppShell` (new, minimal), routed by a reactive device-class check, with zero change to desktop behavior/DOM and zero mobile handling for `admin`.

**Architecture:** Two new composables (`useDeviceClass`, `useDashboardShell`) extract all reactive state and side effects out of `Dashboard.js`. `Dashboard.js` becomes a thin 3-way template branch (`KitchenMonitor` / `DesktopChrome` / `MobileAppShell`) that `provide()`s the shared state; the two new layout components `inject()` it. No router is introduced — `currentView` string-switching stays the navigation mechanism for both chrome variants.

**Tech Stack:** Vue 3 (via `https://unpkg.com/vue@3/dist/vue.esm-browser.js`), no build step, plain ESM imports, Tailwind via CDN. No JS test framework exists in this repo (`package.json` has only `eslint`/`prettier`, no `jest`/`vitest`/`playwright`) — do not add one. Per-task verification is `node --check` (syntax) + `npx eslint` (lint); end-to-end behavioral verification is a single manual QA task using the project's `run` skill.

**Spec:** `docs/superpowers/specs/2026-08-31-mobile-app-shell-phase1-design.md`

## Global Constraints

- No build step: every new file is plain ESM, imported exactly like existing files (`import { ref, ... } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js"`).
- No new i18n keys — mobile chrome reuses the existing `translations` object's keys verbatim.
- Preserve every existing role `v-if` check exactly as written today — do not relax, tighten, or duplicate role logic incorrectly.
- `admin` must never receive `MobileAppShell`, structurally (via the `v-else-if` condition in `Dashboard.js`), regardless of device class.
- `kitchen_staff`'s branch (routing to `KitchenMonitor`) must render byte-identical DOM to what exists today — same wrapper `<div>`/`<main>` classes.
- Desktop rendered DOM must be pixel-identical before/after — `DesktopChrome`'s template is a verbatim copy of the existing header/nav/main/button/modal markup, not a rewrite.
- Don't touch the WebSocket reconnect/backoff formula or the audio-unlock logic beyond relocating them — same event names, same behavior.
- Mobile tab bar's "Active Orders" tap must call `navigateToOrders()` (clears `unreadOrderCount`), never a bare `currentView = 'orders'` assignment.
- Base branch: `feature/mobile-app-shell-phase1` (already created off `origin/main`, holds the spec commit `e11ac03`).

---

## Task 1: `useDeviceClass` composable

**Files:**
- Create: `static/js/composables/useDeviceClass.js`

**Interfaces:**
- Produces: `useDeviceClass(): { isAppShell: ComputedRef<boolean> }` — reactive, updates on pointer-type change, window resize, and orientation change; listeners cleaned up in `onUnmounted`.

- [ ] **Step 1: Write the file**

```js
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";

const LG_BREAKPOINT_PX = 1024; // Tailwind's `lg` breakpoint
const POINTER_QUERY = "(pointer: coarse)";

export function useDeviceClass() {
  const hasCoarsePointer = ref(false);
  const viewportWidth = ref(0);

  let pointerMql = null;
  const handlePointerChange = (e) => {
    hasCoarsePointer.value = e.matches;
  };
  const handleResize = () => {
    viewportWidth.value = window.innerWidth;
  };

  onMounted(() => {
    pointerMql = window.matchMedia(POINTER_QUERY);
    hasCoarsePointer.value = pointerMql.matches;
    viewportWidth.value = window.innerWidth;
    pointerMql.addEventListener("change", handlePointerChange);
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
  });

  onUnmounted(() => {
    if (pointerMql) {
      pointerMql.removeEventListener("change", handlePointerChange);
    }
    window.removeEventListener("resize", handleResize);
    window.removeEventListener("orientationchange", handleResize);
  });

  const isAppShell = computed(
    () => hasCoarsePointer.value && viewportWidth.value < LG_BREAKPOINT_PX,
  );

  return { isAppShell };
}
```

- [ ] **Step 2: Verify syntax**

Run: `node --check static/js/composables/useDeviceClass.js`
Expected: no output, exit code 0.

- [ ] **Step 3: Lint**

Run: `npx eslint static/js/composables/useDeviceClass.js`
Expected: no errors. (If the ESLint config flags `window`/browser globals as undefined, check `.eslintrc*` for an existing `env: { browser: true }` — this project's other `static/js/` files already use `window`/`document` freely, so this should already be configured; do not add ESLint config changes as part of this task unless the existing files themselves also fail, which would indicate a pre-existing issue out of scope for this plan.)

- [ ] **Step 4: Commit**

```bash
git add static/js/composables/useDeviceClass.js
git commit -m "Add useDeviceClass composable for mobile app shell routing"
```

---

## Task 2: `useDashboardShell` composable

**Files:**
- Create: `static/js/composables/useDashboardShell.js`

**Interfaces:**
- Consumes: `api` from `../api.js` (existing module, `api.get`/`api.put`).
- Produces: `useDashboardShell(user: Object): { showUpgradeModal, hasFeature, handleNavClick, currentView, currentComponent, formatRole, liveWalletBalance, walletBadgeClass, isAcceptingOrders, isOpenBySchedule, toggleStoreStatus, currentLang, setLanguage, t, unreadOrderCount, navigateToOrders }` — exact same shape `Dashboard.js`'s old `setup()` returned, verified against `static/js/views/Dashboard.js:509-527` (pre-refactor).

- [ ] **Step 1: Write the file**

```js
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { api } from "../api.js";

const translations = {
  en: {
    Overview: "Overview",
    "Active Orders": "Active Orders",
    "Restaurants Admin": "Restaurants Admin",
    "Menu Management": "Menu Management",
    "Staff Management": "Staff Management",
    "Delivery Agents": "Delivery Agents",
    Deliveries: "Deliveries",
    "Audit Logs": "Audit Logs",
    "💳 Billing": "💳 Billing",
    "📊 Insights & Rapports": "📊 Insights & Reports",
    "Sign Out": "Sign Out",
  },
  fr: {
    Overview: "Aperçu",
    "Active Orders": "Commandes Actives",
    "Restaurants Admin": "Admin Restaurants",
    "Menu Management": "Gestion Menu",
    "Staff Management": "Gestion Personnel",
    "Delivery Agents": "Livreurs",
    Deliveries: "Livraisons",
    "Audit Logs": "Journaux d'Audit",
    "💳 Billing": "💳 Facturation",
    "📊 Insights & Rapports": "📊 Insights & Rapports",
    "Sign Out": "Déconnexion",
  },
  ar: {
    Overview: "نظرة عامة",
    "Active Orders": "الطلبات النشطة",
    "Restaurants Admin": "إدارة المطاعم",
    "Menu Management": "إدارة القائمة",
    "Staff Management": "إدارة الموظفين",
    "Delivery Agents": "عمال التوصيل",
    Deliveries: "التوصيلات",
    "Audit Logs": "سجلات التدقيق",
    "💳 Billing": "💳 الفواتير",
    "📊 Insights & Rapports": "📊 التقارير",
    "Sign Out": "تسجيل الخروج",
  },
};

export function useDashboardShell(user) {
  const defaultView = user.role === "kitchen_staff" ? "kitchen-monitor" : "overview";
  const currentView = ref(defaultView);

  // Language Switcher (Trilingual)
  const currentLang = ref(localStorage.getItem("geqo_admin_lang") || "fr");
  const setLanguage = (lang) => {
    currentLang.value = lang;
    localStorage.setItem("geqo_admin_lang", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  };

  const t = (key) => {
    const lang = currentLang.value;
    if (translations[lang] && translations[lang][key]) {
      return translations[lang][key];
    }
    return key;
  };

  // Live wallet balance — fetched from API on mount, not from stale localStorage
  const liveWalletBalance = ref(user.wallet_balance || 0);
  const isAcceptingOrders = ref(user.is_accepting_orders ?? true);
  const isOpenBySchedule = ref(true); // Computed from backend is_open field

  const fetchLiveBalance = async () => {
    try {
      const res = await api.get("/admin/me");
      liveWalletBalance.value = res.data.wallet_balance || 0;
      isAcceptingOrders.value = res.data.is_accepting_orders ?? true;
    } catch (err) {
      console.warn("[Dashboard] Failed to fetch live wallet balance", err);
    }
    // Also poll is_open (operating hours) via the dashboard endpoint
    try {
      const dashRes = await api.get("/admin/restaurant/dashboard");
      const r = dashRes.data?.restaurant;
      if (r !== undefined) {
        // is_open is the computed field (manual toggle + hours check)
        isOpenBySchedule.value = r.is_open !== false;
      }
    } catch (err) {
      /* non-blocking */
    }
  };

  const toggleStoreStatus = async () => {
    try {
      const newValue = !isAcceptingOrders.value;
      await api.put("/dashboard/restaurant/status", {
        is_accepting_orders: newValue,
      });
      isAcceptingOrders.value = newValue;
    } catch (err) {
      console.error("[Dashboard] Failed to toggle store status", err);
      alert("Failed to update store status. Please try again.");
    }
  };

  onMounted(() => {
    setLanguage(currentLang.value);
    if (["restaurant_owner", "admin"].includes(user.role)) {
      fetchLiveBalance();
    }
    // Boot global WebSocket for real-time order alerts
    if (["restaurant_owner", "cashier"].includes(user.role)) {
      initGlobalWebSocket();
    }
  });

  onUnmounted(() => {
    if (_globalWs) _globalWs.close();
    if (_audioCtx) _audioCtx.close();
  });

  const walletBadgeClass = computed(() => {
    if (liveWalletBalance.value > 20) return "bg-emerald-100 text-emerald-800";
    if (liveWalletBalance.value >= 0) return "bg-amber-100 text-amber-800";
    return "bg-red-100 text-red-800";
  });

  // ─── Global WebSocket + Audio (tab-persistent) ──────────────────────
  const unreadOrderCount = ref(0);
  let _globalWs = null;
  let _globalWsRetry = 0;
  let _audioCtx = null;
  let _audioUnlocked = false;

  // Unlock AudioContext on first user interaction (browser autoplay policy)
  const unlockAudio = () => {
    if (_audioUnlocked) return;
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_audioCtx.state === "suspended") _audioCtx.resume();
    _audioUnlocked = true;
    document.body.removeEventListener("click", unlockAudio);
    document.body.removeEventListener("touchstart", unlockAudio);
  };
  document.body.addEventListener("click", unlockAudio, { once: true });
  document.body.addEventListener("touchstart", unlockAudio, { once: true });

  const playAlertSound = () => {
    try {
      if (!_audioCtx) {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (_audioCtx.state === "suspended") _audioCtx.resume();
      const beep = (freq, startTime, duration) => {
        const osc = _audioCtx.createOscillator();
        const gain = _audioCtx.createGain();
        osc.connect(gain);
        gain.connect(_audioCtx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const t = _audioCtx.currentTime;
      beep(880, t, 0.12);
      beep(1100, t + 0.15, 0.12);
      beep(880, t + 0.3, 0.14);
    } catch (e) {
      console.warn("[Dashboard] Audio alert failed:", e);
    }
  };

  const initGlobalWebSocket = () => {
    if (!user?.restaurant_id) return;
    const token = localStorage.getItem("token");
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    const proto = isLocal ? "ws:" : "wss:";
    const host = isLocal ? "localhost:8000" : "api.mygeqo.com";
    const url = `${proto}//${host}/api/v1/dashboard/ws/${user.restaurant_id}`;
    const isRealToken = token && token !== "cookie";
    _globalWs = isRealToken
      ? new WebSocket(url, [`bearer.${token}`])
      : new WebSocket(url);

    _globalWs.onopen = () => {
      _globalWsRetry = 0;
    };
    _globalWs.onclose = (ev) => {
      if (ev.code === 4001 || ev.code === 4003) return;
      _globalWsRetry++;
      const delay = Math.min(
        30000,
        Math.pow(2, _globalWsRetry) * 1000 + Math.random() * 800,
      );
      setTimeout(initGlobalWebSocket, delay);
    };
    _globalWs.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.event === "NEW_ORDER") {
          // Only increment badge if user is NOT already on orders tab
          if (currentView.value !== "orders") {
            unreadOrderCount.value++;
          }
          playAlertSound();
        }
      } catch {}
    };
  };

  const navigateToOrders = () => {
    currentView.value = "orders";
    unreadOrderCount.value = 0;
  };
  // ────────────────────────────────────────────────────────────────────

  const currentComponent = computed(() => {
    const role = user.role;
    const view = currentView.value;

    if (role === "kitchen_staff") return "KitchenMonitor";

    switch (view) {
      case "overview":
        return "Overview";
      case "orders":
        return "OrdersManager";
      case "deliveries":
        return "DeliveryManager";
      case "restaurants":
        return role === "admin" ? "RestaurantsAdmin" : "Overview";
      case "menu":
        return "MenuManager";
      case "staff":
        return "StaffManager";
      case "drivers":
        return "DriversManager";
      case "audit-log":
        return "AuditLog";
      case "settings":
        return "Settings";
      case "billing":
        return "Billing";
      case "insights":
        return ["admin", "restaurant_owner"].includes(role)
          ? "SuperAdminInsights"
          : "Overview";
      default:
        return "Overview";
    }
  });

  const formatRole = (role) => {
    if (role === "restaurant_owner") return "Owner";
    if (role === "kitchen_staff") return "Kitchen Staff";
    return role;
  };

  const showUpgradeModal = ref(false);
  const hasFeature = (feat) => {
    if (user.role === "admin") return true;
    return user.features && user.features[feat];
  };

  const handleNavClick = (viewName, featureRequired) => {
    if (featureRequired && !hasFeature(featureRequired)) {
      showUpgradeModal.value = true;
      return;
    }
    currentView.value = viewName;
  };

  return {
    showUpgradeModal,
    hasFeature,
    handleNavClick,
    currentView,
    currentComponent,
    formatRole,
    liveWalletBalance,
    walletBadgeClass,
    isAcceptingOrders,
    isOpenBySchedule,
    toggleStoreStatus,
    currentLang,
    setLanguage,
    t,
    unreadOrderCount,
    navigateToOrders,
  };
}
```

- [ ] **Step 2: Verify syntax**

Run: `node --check static/js/composables/useDashboardShell.js`
Expected: no output, exit code 0.

- [ ] **Step 3: Lint**

Run: `npx eslint static/js/composables/useDashboardShell.js`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add static/js/composables/useDashboardShell.js
git commit -m "Add useDashboardShell composable, extracted from Dashboard.js"
```

---

## Task 3: `DesktopChrome` layout component

**Files:**
- Create: `static/js/layouts/DesktopChrome.js`

**Interfaces:**
- Consumes: `inject('t')`, `inject('currentLang')`, `inject('dashboardShell')` (the object shape produced by Task 2's `useDashboardShell`). Props: `{ user: Object }`. Emits: `logout`.
- Produces: default-exported Vue component `DesktopChrome`, mountable as `<DesktopChrome :user="user" @logout="..." />`.

- [ ] **Step 1: Write the file**

This is a verbatim copy of the header/nav/main/floating-button/modal markup currently in `static/js/views/Dashboard.js:66-256`, with the `setup()` body replaced by inject-and-spread (since the state now lives in the injected `dashboardShell` object rather than being defined locally).

```js
import { inject } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import Overview from "../views/Overview.js";
import RestaurantsAdmin from "../views/RestaurantsAdmin.js";
import MenuManager from "../views/MenuManager.js";
import DriversManager from "../views/DriversManager.js";
import OrdersManager from "../views/OrdersManager.js";
import DeliveryManager from "../views/DeliveryManager.js";
import StaffManager from "../views/StaffManager.js";
import AuditLog from "../views/AuditLog.js";
import Settings from "../views/Settings.js";
import Billing from "../views/Billing.js";
import SuperAdminInsights from "../views/SuperAdminInsights.js";

export default {
  name: "DesktopChrome",
  template: `
        <div class="min-h-screen bg-slate-50 flex flex-col">
            <!-- Header (Hidden for Kitchen Monitor) -->
            <header v-if="user.role !== 'kitchen_staff'" class="bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center h-16">
                        <button @click="currentView = 'overview'" class="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                            <img src="/img/geqo-emblem.svg" alt="GEQO Setae Mark" class="w-8 h-8 rounded shadow-sm object-contain flex-shrink-0" />
                            <span class="text-xl font-extrabold tracking-tight text-slate-900" style="font-family: 'Space Grotesk', 'Plus Jakarta Sans', sans-serif; letter-spacing: -0.02em;">
                                GE<span style="color:#F59E0B;">QO</span>
                            </span>
                        </button>
                        <div class="flex items-center space-x-4">
                            <div class="hidden sm:flex flex-col items-end">
                                <span class="text-sm font-medium text-slate-900">{{ user.email }}</span>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 mt-0.5 uppercase tracking-wider">{{ formatRole(user.role) }}</span>
                                    <span v-if="user.role === 'restaurant_owner'"
                                          class="text-xs font-bold px-2.5 py-0.5 rounded-full mt-0.5 whitespace-nowrap"
                                          :class="walletBadgeClass">
                                        {{ liveWalletBalance.toFixed(2) }} MAD
                                    </span>
                                    <button v-if="['restaurant_owner', 'cashier'].includes(user.role)"
                                            @click="toggleStoreStatus"
                                            class="text-[10px] font-bold px-2.5 py-1 rounded-full mt-0.5 whitespace-nowrap border transition-all shadow-sm"
                                            :class="
                                                !isAcceptingOrders
                                                    ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                                    : !isOpenBySchedule
                                                        ? 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'
                                                        : 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'
                                            ">
                                        <template v-if="!isAcceptingOrders">🔴 STORE PAUSED</template>
                                        <template v-else-if="!isOpenBySchedule">🟡 AUTO-CLOSED</template>
                                        <template v-else>🟢 STORE OPEN</template>
                                    </button>
                                </div>
                            </div>
                            <div class="hidden sm:flex items-center bg-slate-100 rounded-lg p-1 ml-2">
                                <button @click="setLanguage('en')" :class="currentLang === 'en' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'" class="px-2 py-1 rounded text-[10px] font-bold transition-colors">EN</button>
                                <button @click="setLanguage('fr')" :class="currentLang === 'fr' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'" class="px-2 py-1 rounded text-[10px] font-bold transition-colors">FR</button>
                                <button @click="setLanguage('ar')" :class="currentLang === 'ar' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'" class="px-2 py-1 rounded text-[10px] font-bold transition-colors">AR</button>
                            </div>
                            <div class="w-px h-8 bg-slate-200 hidden sm:block"></div>
                            <button @click="$emit('logout')" class="text-sm font-semibold text-slate-500 hover:text-red-600 transition-colors px-2.5 py-1 rounded-lg hover:bg-slate-100">
                                {{ t('Sign Out') }}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Navigation (Hidden for Kitchen Monitor) -->
            <nav v-if="user.role !== 'kitchen_staff'" class="bg-white border-b border-slate-200 shadow-sm shrink-0">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex space-x-1 py-3 overflow-x-auto hide-scrollbar" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'">
                        <!-- Overview: Admin, Owner, Cashier -->
                        <button v-if="['admin', 'restaurant_owner', 'cashier'].includes(user.role)"
                                @click="currentView = 'overview'"
                                :class="currentView === 'overview' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap">
                            {{ t('Overview') }}
                        </button>

                        <!-- Active Orders: Owner, Cashier -->
                        <button v-if="['restaurant_owner', 'cashier'].includes(user.role)"
                                @click="navigateToOrders"
                                :class="currentView === 'orders' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap relative">
                            {{ t('Active Orders') }}
                            <!-- Saffron unread badge -->
                            <span v-if="unreadOrderCount > 0"
                                  class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse shadow-lg shadow-amber-500/40">
                                {{ unreadOrderCount }}
                            </span>
                            <!-- Static live dot when no unread -->
                            <span v-else class="absolute top-2 right-1.5 flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </button>

                        <!-- Restaurants Admin: Admin only -->
                        <button v-if="user.role === 'admin'"
                                @click="currentView = 'restaurants'"
                                :class="currentView === 'restaurants' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap">
                            {{ t('Restaurants Admin') }}
                        </button>

                        <!-- Menu Management: Owner, Cashier -->
                        <button v-if="['restaurant_owner', 'cashier'].includes(user.role)"
                                @click="currentView = 'menu'"
                                :class="currentView === 'menu' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap">
                            {{ t('Menu Management') }}
                        </button>

                        <!-- Staff Management: Owner only -->
                        <button v-if="user.role === 'restaurant_owner'"
                                @click="currentView = 'staff'"
                                :class="currentView === 'staff' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap">
                            {{ t('Staff Management') }}
                        </button>

                        <!-- Delivery Agents: Owner, Cashier -->
                        <button v-if="['restaurant_owner', 'cashier'].includes(user.role)"
                                @click="currentView = 'drivers'"
                                :class="currentView === 'drivers' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap">
                            {{ t('Delivery Agents') }}
                        </button>

                        <!-- Deliveries: Owner, Cashier -->
                        <button v-if="['restaurant_owner', 'cashier'].includes(user.role)"
                                @click="currentView = 'deliveries'"
                                :class="currentView === 'deliveries' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap">
                            {{ t('Deliveries') }}
                        </button>

                        <!-- Audit Logs: Admin, Owner -->
                        <button v-if="['admin', 'restaurant_owner'].includes(user.role)"
                                @click="currentView = 'audit-log'"
                                :class="currentView === 'audit-log' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap">
                            {{ t('Audit Logs') }}
                        </button>

                        <!-- Billing: Owner ONLY -->
                        <button v-if="['restaurant_owner', 'admin'].includes(user.role)"
                                @click="currentView = 'billing'"
                                :class="currentView === 'billing' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap">
                            {{ t('💳 Billing') }}
                        </button>

                        <!-- Insights & Reports: Admin always; Owner only on SCALE/MULTI -->
                        <button v-if="user.role === 'admin' || (user.role === 'restaurant_owner' && ['SCALE', 'MULTI'].includes(user.subscription_tier))"
                                @click="handleNavClick('insights', 'pdf_reports')"
                                :class="currentView === 'insights' ? 'bg-amber-500 text-white font-semibold shadow-sm shadow-amber-500/30' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap flex items-center gap-1">
                            {{ t('📊 Insights & Rapports') }}
                        </button>
                        
                        <!-- GEQO Boost Campaigns: Admin + Restaurant Owner -->
                        <button v-if="['admin', 'restaurant_owner'].includes(user.role)"
                                @click="handleNavClick('campaigns', 'campaigns')"
                                :class="currentView === 'campaigns' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap flex items-center gap-1">
                            <span v-if="!hasFeature('campaigns')">🔒</span>
                            {{ t('🚀 Boost Campaigns') }}
                        </button>
                    </div>
                </div>
            </nav>

            <!-- Content Area -->
            <main :class="user.role === 'kitchen_staff' ? 'flex-1 flex flex-col h-screen min-h-0 bg-[#0A0A0A] p-0 m-0' : 'flex-1 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full'">
                <component :is="currentComponent" :user="user" :lang="currentLang" :t="t" @logout="$emit('logout')"></component>
            </main>

            <!-- Floating Settings Button (Bottom Left) -->
            <button v-if="user.role !== 'kitchen_staff'"
                    @click="currentView = 'settings'"
                    class="fixed bottom-6 left-6 z-40 p-3 rounded-full shadow-lg border transition-all flex items-center justify-center group bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                    :class="currentView === 'settings' ? '!bg-emerald-600 !text-white !border-blue-600 shadow-blue-500/30' : ''">
                <svg class="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
            </button>

            <!-- Upgrade Modal -->
            <div v-if="showUpgradeModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center">
                    <div class="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🔒</div>
                    <h3 class="text-xl font-bold text-slate-900 mb-2">Fonctionnalité Verrouillée</h3>
                    <p class="text-slate-600 mb-6 text-sm">
                        Cette fonctionnalité nécessite le forfait Scale (1 299 DH/mois). Cliquez ici pour demander une mise à niveau par email.
                    </p>
                    <div class="flex gap-3 justify-center">
                        <button @click="showUpgradeModal = false" class="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Fermer</button>
                        <a href="mailto:sales@mygeqo.com?subject=Demande%20de%20mise%20%C3%A0%20niveau%20-%20Forfait%20Scale&body=Bonjour%2C%20je%20souhaite%20passer%20au%20forfait%20Scale." class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                            <i class="fas fa-envelope"></i> Contacter l'équipe
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `,
  components: {
    Overview,
    RestaurantsAdmin,
    MenuManager,
    DriversManager,
    OrdersManager,
    DeliveryManager,
    StaffManager,
    AuditLog,
    Settings,
    Billing,
    SuperAdminInsights,
  },
  props: {
    user: Object,
  },
  emits: ["logout"],
  setup() {
    const t = inject("t");
    const currentLang = inject("currentLang");
    const shell = inject("dashboardShell");
    return { t, currentLang, ...shell };
  },
};
```

Note: `Settings` and `Billing` are referenced by `currentComponent` (view `'settings'`/`'billing'`) and must stay registered here since the floating settings button and the Billing nav item both route through `DesktopChrome`. `KitchenMonitor` is intentionally NOT imported/registered — this component never renders for `kitchen_staff`.

- [ ] **Step 2: Verify syntax**

Run: `node --check static/js/layouts/DesktopChrome.js`
Expected: no output, exit code 0.

- [ ] **Step 3: Lint**

Run: `npx eslint static/js/layouts/DesktopChrome.js`
Expected: no errors.

- [ ] **Step 4: Diff the template string against the original**

Run: `diff <(sed -n '66,256p' static/js/views/Dashboard.js) <(sed -n '/template: `/,/`,/p' static/js/layouts/DesktopChrome.js | sed '1d;$d')`
Expected: no differences in the markup itself (only whitespace from the extraction sed boundaries is acceptable — inspect any reported diff manually and confirm it's not a real markup change before proceeding).

- [ ] **Step 5: Commit**

```bash
git add static/js/layouts/DesktopChrome.js
git commit -m "Add DesktopChrome layout, extracted verbatim from Dashboard.js"
```

---

## Task 4: `MobileAppShell` layout component

**Files:**
- Create: `static/js/layouts/MobileAppShell.js`

**Interfaces:**
- Consumes: `inject('t')`, `inject('currentLang')`, `inject('dashboardShell')` (same shape as Task 3). Props: `{ user: Object }`. Emits: `logout`.
- Produces: default-exported Vue component `MobileAppShell`, mountable as `<MobileAppShell :user="user" @logout="..." />`. Local-only state: `mobileDeliveriesSubView` (not part of `dashboardShell` — pure UI state for which of Drivers/Deliveries the folded tab currently shows).

- [ ] **Step 1: Write the file**

```js
import { inject, ref } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import Overview from "../views/Overview.js";
import OrdersManager from "../views/OrdersManager.js";
import MenuManager from "../views/MenuManager.js";
import DriversManager from "../views/DriversManager.js";
import DeliveryManager from "../views/DeliveryManager.js";

export default {
  name: "MobileAppShell",
  template: `
        <div class="min-h-screen bg-slate-50 flex flex-col">
            <!-- Top bar: logo, wallet badge, store-open toggle, sign out. No language switcher, no nav row. -->
            <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0">
                <div class="flex justify-between items-center h-14 px-4">
                    <button @click="currentView = 'overview'" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <img src="/img/geqo-emblem.svg" alt="GEQO Setae Mark" class="w-7 h-7 rounded shadow-sm object-contain flex-shrink-0" />
                        <span class="text-lg font-extrabold tracking-tight text-slate-900" style="font-family: 'Space Grotesk', 'Plus Jakarta Sans', sans-serif; letter-spacing: -0.02em;">
                            GE<span style="color:#F59E0B;">QO</span>
                        </span>
                    </button>
                    <div class="flex items-center gap-2">
                        <span v-if="user.role === 'restaurant_owner'"
                              class="text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap"
                              :class="walletBadgeClass">
                            {{ liveWalletBalance.toFixed(2) }} MAD
                        </span>
                        <button v-if="['restaurant_owner', 'cashier'].includes(user.role)"
                                @click="toggleStoreStatus"
                                class="text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap border transition-all shadow-sm"
                                :class="
                                    !isAcceptingOrders
                                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                                        : !isOpenBySchedule
                                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                ">
                            <template v-if="!isAcceptingOrders">🔴</template>
                            <template v-else-if="!isOpenBySchedule">🟡</template>
                            <template v-else>🟢</template>
                        </button>
                        <button @click="$emit('logout')"
                                :title="t('Sign Out')"
                                :aria-label="t('Sign Out')"
                                class="text-slate-500 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-slate-100">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <!-- Bottom tab bar: curated 4-tab set, fixed to viewport bottom. -->
            <nav class="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'">
                <div class="flex items-stretch">
                    <button v-if="['restaurant_owner', 'cashier'].includes(user.role)"
                            @click="currentView = 'overview'"
                            :class="currentView === 'overview' ? 'text-emerald-600' : 'text-slate-500'"
                            class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors">
                        <span>🏠</span>
                        <span>{{ t('Overview') }}</span>
                    </button>

                    <button v-if="['restaurant_owner', 'cashier'].includes(user.role)"
                            @click="navigateToOrders"
                            :class="currentView === 'orders' ? 'text-emerald-600' : 'text-slate-500'"
                            class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors">
                        <span class="relative inline-block">
                            📋
                            <span v-if="unreadOrderCount > 0"
                                  class="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                                {{ unreadOrderCount }}
                            </span>
                        </span>
                        <span>{{ t('Active Orders') }}</span>
                    </button>

                    <button v-if="['restaurant_owner', 'cashier'].includes(user.role)"
                            @click="currentView = 'menu'"
                            :class="currentView === 'menu' ? 'text-emerald-600' : 'text-slate-500'"
                            class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors">
                        <span>🍽️</span>
                        <span>{{ t('Menu Management') }}</span>
                    </button>

                    <button v-if="['restaurant_owner', 'cashier'].includes(user.role)"
                            @click="openDeliveriesTab"
                            :class="['drivers', 'deliveries'].includes(currentView) ? 'text-emerald-600' : 'text-slate-500'"
                            class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors">
                        <span>🛵</span>
                        <span>{{ t('Deliveries') }}</span>
                    </button>
                </div>
            </nav>

            <!-- Content -->
            <main class="flex-1 w-full px-4 py-4 pb-20">
                <div v-if="['restaurant_owner', 'cashier'].includes(user.role) && ['drivers', 'deliveries'].includes(currentView)"
                     class="flex items-center bg-slate-100 rounded-lg p-1 mb-4 w-fit">
                    <button @click="switchDeliveriesSubView('deliveries')"
                            :class="currentView === 'deliveries' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'"
                            class="px-3 py-1 rounded text-xs font-bold transition-colors">
                        {{ t('Deliveries') }}
                    </button>
                    <button @click="switchDeliveriesSubView('drivers')"
                            :class="currentView === 'drivers' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'"
                            class="px-3 py-1 rounded text-xs font-bold transition-colors">
                        {{ t('Delivery Agents') }}
                    </button>
                </div>
                <component :is="currentComponent" :user="user" :lang="currentLang" :t="t" @logout="$emit('logout')"></component>
            </main>
        </div>
    `,
  components: {
    Overview,
    OrdersManager,
    MenuManager,
    DriversManager,
    DeliveryManager,
  },
  props: {
    user: Object,
  },
  emits: ["logout"],
  setup() {
    const t = inject("t");
    const currentLang = inject("currentLang");
    const shell = inject("dashboardShell");

    // Which sub-view the folded "Deliveries" tab shows; remembers the
    // last choice across taps on the tab itself.
    const mobileDeliveriesSubView = ref("deliveries");

    const openDeliveriesTab = () => {
      shell.currentView.value = mobileDeliveriesSubView.value;
    };

    const switchDeliveriesSubView = (view) => {
      mobileDeliveriesSubView.value = view;
      shell.currentView.value = view;
    };

    return {
      t,
      currentLang,
      ...shell,
      mobileDeliveriesSubView,
      openDeliveriesTab,
      switchDeliveriesSubView,
    };
  },
};
```

Known limitation (matches the approved spec — not a defect to fix in this task): `cashier`/`restaurant_owner` roles reach only 4 views from this shell's own UI (`overview`, `orders`, `menu`, `drivers`/`deliveries`). If `currentView` is left on an excluded view (e.g. `'settings'`) from a prior `DesktopChrome` session and the viewport then crosses into app-shell territory (e.g. rotating a tablet), `currentComponent` will resolve to a component not registered here (Vue renders nothing for that tag, with a console warning, no crash) until the user taps a mobile tab. Out of scope for phase 1 per the approved spec.

- [ ] **Step 2: Verify syntax**

Run: `node --check static/js/layouts/MobileAppShell.js`
Expected: no output, exit code 0.

- [ ] **Step 3: Lint**

Run: `npx eslint static/js/layouts/MobileAppShell.js`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add static/js/layouts/MobileAppShell.js
git commit -m "Add MobileAppShell layout with curated bottom tab bar"
```

---

## Task 5: Rewire `Dashboard.js`

**Files:**
- Modify: `static/js/views/Dashboard.js` (full rewrite — old template/setup body is being replaced wholesale, having been relocated in Tasks 2-4)

**Interfaces:**
- Consumes: `useDeviceClass` (Task 1), `useDashboardShell` (Task 2), `DesktopChrome` (Task 3), `MobileAppShell` (Task 4), `KitchenMonitor` (existing, `./KitchenMonitor.js`, untouched).
- Produces: default-exported Vue component `Dashboard` with the same public contract as before (`props: { user: Object }`, `emits: ["logout"]`) — this is what `static/js/app.js` mounts, unchanged there.

- [ ] **Step 1: Rewrite the file**

```js
import { provide } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import KitchenMonitor from "./KitchenMonitor.js";
import DesktopChrome from "../layouts/DesktopChrome.js";
import MobileAppShell from "../layouts/MobileAppShell.js";
import { useDeviceClass } from "../composables/useDeviceClass.js";
import { useDashboardShell } from "../composables/useDashboardShell.js";

export default {
  template: `
        <div v-if="user.role === 'kitchen_staff'" class="min-h-screen bg-slate-50 flex flex-col">
            <main class="flex-1 flex flex-col h-screen min-h-0 bg-[#0A0A0A] p-0 m-0">
                <KitchenMonitor :user="user" :lang="currentLang" :t="t" @logout="$emit('logout')"></KitchenMonitor>
            </main>
        </div>
        <DesktopChrome v-else-if="!isAppShell || user.role === 'admin'" :user="user" @logout="$emit('logout')"></DesktopChrome>
        <MobileAppShell v-else :user="user" @logout="$emit('logout')"></MobileAppShell>
    `,
  components: {
    KitchenMonitor,
    DesktopChrome,
    MobileAppShell,
  },
  props: {
    user: Object,
  },
  emits: ["logout"],
  setup(props) {
    const { isAppShell } = useDeviceClass();
    const shell = useDashboardShell(props.user);

    provide("t", shell.t);
    provide("currentLang", shell.currentLang);
    provide("dashboardShell", shell);

    return {
      isAppShell,
      currentLang: shell.currentLang,
      t: shell.t,
    };
  },
};
```

- [ ] **Step 2: Verify syntax**

Run: `node --check static/js/views/Dashboard.js`
Expected: no output, exit code 0.

- [ ] **Step 3: Lint**

Run: `npx eslint static/js/views/Dashboard.js`
Expected: no errors.

- [ ] **Step 4: Confirm `app.js` needs no changes**

Run: `grep -n "Dashboard" static/js/app.js`
Expected: only the existing `import Dashboard from "./views/Dashboard.js";` and its use in `components: {...}` / template — `Dashboard`'s external contract (`:user`, `@logout`) is unchanged, so `app.js` needs no edits. If this grep shows anything referencing internals of the old `Dashboard.js` (e.g. reading `currentView` from outside), stop and re-scope — that would mean the extraction broke an external dependency the spec didn't account for.

- [ ] **Step 5: Commit**

```bash
git add static/js/views/Dashboard.js
git commit -m "Rewire Dashboard.js to route between DesktopChrome and MobileAppShell"
```

---

## Task 6: Manual QA pass

**Files:** none (verification only, using the project's `run` skill to launch the app in a real browser).

- [ ] **Step 1: Launch the app**

Use the `run` skill (or, if no project-specific run skill is registered for this repo, serve `static/` with any static file server, e.g. `python3 -m http.server 8080` from the repo root, then open `http://localhost:8080` in a browser) against a backend that can authenticate at least one user per role: `admin`, `restaurant_owner`, `cashier`, `kitchen_staff`. If a live backend isn't reachable in this environment, mock `/admin/me` to return each role in turn via browser devtools, or coordinate with the user for credentials — do not skip this task or mark it done on the basis of code review alone.

- [ ] **Step 2: Desktop parity check, per role**

At a desktop viewport (≥1024px width, mouse/trackpad — i.e. `isAppShell` false), for `admin`, `restaurant_owner`, and `cashier`: confirm the header, nav row, content area, floating settings button, and (trigger it) upgrade modal render identically to how they did before this branch (compare against `main` in a second tab/window if possible, or against the screenshots/notes taken before starting this plan). Confirm every nav item that should be visible for that role is visible, and every one that shouldn't isn't (cross-check against the `v-if` conditions listed in the Global Constraints section and in `DesktopChrome.js`).

- [ ] **Step 3: `admin` never gets `MobileAppShell`**

Log in as `admin`, then resize the browser window below 1024px width AND simulate a coarse pointer (Chrome DevTools device toolbar, any touch device preset). Confirm `DesktopChrome` still renders (header + horizontal nav), never `MobileAppShell`.

- [ ] **Step 4: Mobile shell, per eligible role**

Log in as `restaurant_owner`, then `cashier`. In DevTools device toolbar, pick a touch device preset narrower than 1024px (e.g. "iPhone 14" or "iPad Mini" in portrait). Confirm: top bar shows logo + wallet badge (owner only) + store toggle + sign-out icon, no language switcher, no horizontal nav row; bottom tab bar shows exactly 4 tabs (Overview, Active Orders, Menu Management, Deliveries); tapping each tab renders the expected view in the content area below.

- [ ] **Step 5: Active Orders tab clears the unread badge**

While logged in as `restaurant_owner` or `cashier` on the mobile shell, trigger a `NEW_ORDER` WebSocket event while on a different tab (e.g. via the backend, or by simulating the message in DevTools console: dispatch through the existing `_globalWs.onmessage` path if accessible, or place a real test order) so the Active Orders tab's badge increments. Tap the Active Orders tab. Confirm the badge disappears (i.e. `navigateToOrders()` ran, not a bare view switch) — this is the specific regression the user flagged during design review.

- [ ] **Step 6: Deliveries fold**

On the mobile shell, tap the Deliveries tab; confirm it opens to the "Deliveries" sub-view by default, the in-view toggle shows both "Deliveries" and "Delivery Agents" options, and switching between them swaps `DeliveryManager`/`DriversManager` in the content area while the bottom tab bar's Deliveries tab stays highlighted for both.

- [ ] **Step 7: `kitchen_staff` untouched**

Log in as `kitchen_staff` at both a desktop and a narrow/touch viewport. Confirm `KitchenMonitor` renders full-screen exactly as before in both cases — no header, no nav, no bottom tab bar, no top bar — regardless of device class.

- [ ] **Step 8: Reactivity check**

While on the mobile shell (touch device preset, narrow width), resize the DevTools viewport across the 1024px threshold without changing the pointer-type emulation. Confirm the chrome switches between `MobileAppShell` and `DesktopChrome` live, without a page reload.

- [ ] **Step 9: Record results**

Note any failures found. If any step fails, fix the relevant file from Tasks 1-5, re-run `node --check` + `eslint` on it, re-verify the specific failed QA step, and commit the fix before proceeding to Task 7.

---

## Task 7: Open the PR

**Files:** none.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feature/mobile-app-shell-phase1
```

- [ ] **Step 2: Open the PR**

```bash
gh pr create --title "Mobile app shell phase 1: structural chrome split" --body "$(cat <<'EOF'
## Summary
- Structural-only split of the admin dashboard's chrome into `DesktopChrome` (existing markup, unchanged) and a new minimal `MobileAppShell`, routed by a reactive device-class check (`pointer: coarse` AND viewport width < 1024px).
- No view component (OrdersManager, MenuManager, etc.) was redesigned; both chrome variants render the exact same components via the same `currentComponent` computed.

## Files
**New:**
- `static/js/composables/useDeviceClass.js` — reactive `isAppShell` (pointer + width, updates on resize/orientation change)
- `static/js/composables/useDashboardShell.js` — all state/logic extracted from the old `Dashboard.js` (nav state, wallet polling, store toggle, language, global WS + audio alerts, unread badge, upgrade modal, `formatRole`)
- `static/js/layouts/DesktopChrome.js` — verbatim extraction of the existing header/nav/main/floating-button/modal markup
- `static/js/layouts/MobileAppShell.js` — new minimal top bar (logo, wallet badge, store toggle, sign out) + 4-tab bottom bar (Overview, Active Orders, Menu, Deliveries — Delivery Agents/Deliveries folded into one tab with an in-view toggle)

**Modified:**
- `static/js/views/Dashboard.js` — now state-wiring only: `KitchenMonitor` (untouched branch) / `DesktopChrome` / `MobileAppShell`, provide/inject instead of prop-drilling

## Desktop unchanged?
Confirmed via manual QA (Task 6, steps 2-3 of the implementation plan) — `DesktopChrome`'s template is a verbatim copy of the pre-refactor markup; diffed line-for-line during implementation (Task 3, step 4).

## `admin` never gets `MobileAppShell`?
Confirmed structurally, not just visually: `Dashboard.js`'s template routes `admin` to `DesktopChrome` via `v-else-if="!isAppShell || user.role === 'admin'"` — `admin` reaches `DesktopChrome` unconditionally regardless of `isAppShell`. Manually verified (Task 6, step 3) that resizing + touch-emulating as `admin` still renders `DesktopChrome`.

## Test plan
- [x] `node --check` + `eslint` clean on every new/modified file
- [x] Manual QA per role (admin, restaurant_owner, cashier, kitchen_staff) at desktop and mobile viewports — see Task 6 of `docs/superpowers/plans/2026-08-31-mobile-app-shell-phase1.md`
- [x] Verified Active Orders tab tap clears the unread badge (calls `navigateToOrders()`, not a bare `currentView` assignment)

Spec: `docs/superpowers/specs/2026-08-31-mobile-app-shell-phase1-design.md`
Plan: `docs/superpowers/plans/2026-08-31-mobile-app-shell-phase1.md`
EOF
)"
```

- [ ] **Step 3: Report the PR URL to the user.**
