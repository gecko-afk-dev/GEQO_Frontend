# Mobile App Shell — Phase 1 (structural split)

## Goal

Split `Dashboard.js`'s single hard-coded chrome (header + horizontal nav row)
into two chrome variants — `DesktopChrome` (existing markup, unchanged) and
`MobileAppShell` (new, minimal) — selected by device class. This is a
structural refactor only. No view component (`OrdersManager.js`, etc.) is
redesigned. No desktop behavior or DOM output changes.

## Non-goals

- Touch-first visual polish (cards vs tables, bottom sheets, transitions,
  bigger tap targets) — later phase.
- Redesigning any view component.
- Mobile handling for `admin` role — `admin` always gets `DesktopChrome`.
- Touching `KitchenMonitor`'s own markup/logic, or its role gate's behavior.
- A Vue Router — none exists today, none is introduced.

## Current state (as of this branch, based off `main`)

`static/js/views/Dashboard.js` (528 lines) owns, all in one `setup()`:
header markup, nav markup (horizontal-scrolling pill buttons, one `v-if` per
role-gated item), `<main>` + `<component :is="currentComponent">`, floating
settings button, upgrade modal, the `translations` object + `t()`,
`currentView` ref, `currentComponent` computed, wallet balance
(`liveWalletBalance`, `walletBadgeClass`, `fetchLiveBalance`),
`isAcceptingOrders`/`isOpenBySchedule`/`toggleStoreStatus`, language
switching (`currentLang`, `setLanguage`), the global WebSocket + audio-alert
logic (`initGlobalWebSocket`, `playAlertSound`, `unlockAudio`,
`unreadOrderCount`, `navigateToOrders`), `showUpgradeModal`/`hasFeature`/
`handleNavClick`, `formatRole`.

For `kitchen_staff`, the header/nav/floating-button/modal are hidden via
`v-if="user.role !== 'kitchen_staff'"` (present in the tree conditionally,
not structurally separate), and `<main>` gets a different class
(`h-screen ... bg-[#0A0A0A]`) wrapping `<component :is="currentComponent">`
which resolves to `KitchenMonitor` via a check at the top of the
`currentComponent` computed. `KitchenMonitor`'s own root element is
`h-[calc(100vh-80px)]`, i.e. it depends on being inside that `h-screen`
`<main>`.

No `static/js/composables/` directory exists yet. No component currently
uses `inject()` — the existing `provide('t', t)` / `provide('currentLang',
currentLang)` in `Dashboard.js` currently has zero consumers, but the
pattern is being extended rather than replaced.

## New files

- `static/js/composables/useDeviceClass.js`
- `static/js/composables/useDashboardShell.js`
- `static/js/layouts/DesktopChrome.js`
- `static/js/layouts/MobileAppShell.js`

## Modified files

- `static/js/views/Dashboard.js` — gutted to state wiring + a 3-way
  template branch.

## `useDeviceClass.js`

```js
export function useDeviceClass() {
  // returns { isAppShell } — a computed/ref, reactive
}
```

- `isAppShell.value = matchMedia('(pointer: coarse)').matches && window.innerWidth < 1024` (Tailwind `lg`).
- Both conditions required: excludes wide touch laptops/monitors, excludes narrow-but-resized desktop windows.
- Reactivity: listen to the `(pointer: coarse)` `MediaQueryList`'s `change` event, and a `window` `resize` listener (for the width threshold — `matchMedia` alone won't fire on resize unless the width query itself is part of the media string; simplest robust approach is to also register a `matchMedia('(max-width: 1023px)')` listener and combine both, OR recompute both raw conditions on both events). Implementation is free to combine into one or two `MediaQueryList`s as long as both a pointer-type change and a width crossing correctly update `isAppShell` live.
- Clean up all listeners in `onUnmounted`.

## `useDashboardShell.js`

```js
export function useDashboardShell(user) {
  // returns everything currently returned by Dashboard.js's setup(),
  // unchanged in behavior:
  // currentView, currentComponent, formatRole,
  // liveWalletBalance, walletBadgeClass, isAcceptingOrders, isOpenBySchedule,
  // toggleStoreStatus, currentLang, setLanguage, t,
  // unreadOrderCount, navigateToOrders,
  // showUpgradeModal, hasFeature, handleNavClick
}
```

- Straight move of the existing `setup()` body (translations object stays
  module-level in this file, or stays in `Dashboard.js` and is imported —
  either is fine as long as `t()` output is byte-identical).
- `onMounted`/`onUnmounted` logic (WS boot/teardown, audio unlock listener
  registration, `fetchLiveBalance` call, `setLanguage` init) moves in as-is
  — same role checks, same event names, same backoff formula in
  `initGlobalWebSocket`'s `onclose`.
- `currentComponent` keeps its `if (role === "kitchen_staff") return
  "KitchenMonitor"` guard even though that branch is now unreachable via
  this computed in practice (Dashboard.js's template no longer routes
  `kitchen_staff` through `DesktopChrome`/`MobileAppShell` at all) — leave
  it, it's dead-but-harmless defensive code, not worth touching.

## `Dashboard.js` (new shape)

```js
setup(props) {
  const { isAppShell } = useDeviceClass();
  const shell = useDashboardShell(props.user);

  provide('t', shell.t);
  provide('currentLang', shell.currentLang);
  provide('dashboardShell', shell);

  return { isAppShell, user: props.user, ...shell };
}
```

Template:

```html
<div v-if="user.role === 'kitchen_staff'" class="min-h-screen bg-slate-50 flex flex-col">
  <main class="flex-1 flex flex-col h-screen min-h-0 bg-[#0A0A0A] p-0 m-0">
    <KitchenMonitor :user="user" :lang="currentLang" :t="t" @logout="$emit('logout')" />
  </main>
</div>
<DesktopChrome v-else-if="!isAppShell || user.role === 'admin'" :user="user" @logout="$emit('logout')" />
<MobileAppShell v-else :user="user" @logout="$emit('logout')" />
```

The wrapper div+main around `KitchenMonitor` is preserved verbatim from
today's rendered DOM (today it's the same wrapper, just with header/nav/
button/modal siblings present-but-`v-if`-false rather than absent) —
because `KitchenMonitor`'s root uses `h-[calc(100vh-80px)]`, which depends
on its parent chain, this wrapper must not be dropped even though the
sibling chrome elements are gone. This keeps the `kitchen_staff` branch's
rendered output identical to today while satisfying "leave it untouched."

`admin` bypasses `isAppShell` entirely via the `v-else-if` condition — no
mobile-handling code path exists for `admin` at all, structurally
guaranteed, not just visually hidden.

## `DesktopChrome.js`

Pure extraction. Receives `:user`, emits `logout`. Injects `t`,
`currentLang`, and `dashboardShell` (destructures the pieces it uses:
`currentView`, `currentComponent`, `formatRole`, `liveWalletBalance`,
`walletBadgeClass`, `isAcceptingOrders`, `isOpenBySchedule`,
`toggleStoreStatus`, `setLanguage`, `unreadOrderCount`, `navigateToOrders`,
`showUpgradeModal`, `hasFeature`, `handleNavClick`). Template is the
existing header + nav + `<main><component :is="currentComponent"
:user :lang="currentLang" :t @logout></component></main>` + floating
settings button + upgrade modal, copied verbatim (including the now-inert
`v-if="user.role !== 'kitchen_staff'"` guards on header/nav/button/modal —
left in place rather than stripped, since this component is never mounted
for `kitchen_staff` anyway and stripping them is an edit this phase doesn't
need to make). Must register all the view components it renders via
`<component :is>` (`Overview`, `OrdersManager`, `RestaurantsAdmin`,
`MenuManager`, `StaffManager`, `DriversManager`, `DeliveryManager`,
`AuditLog`, `Settings`, `Billing`, `SuperAdminInsights` — `KitchenMonitor`
is NOT needed here, it never reaches this component).

**Verification**: diff the rendered `outerHTML` of `Dashboard.js` before
this change vs. `DesktopChrome.js` after, for each role, at a desktop
viewport — must be identical (module import path changes aside).

## `MobileAppShell.js`

Receives `:user`, emits `logout`. Injects `t`, `currentLang`,
`dashboardShell` (same destructure as `DesktopChrome`, plus it needs
`currentView` for the tab-tap handler).

**Top bar** (minimal, no language switcher, no horizontal nav row):
logo (same click-to-overview behavior as desktop: `@click="currentView =
'overview'"`), wallet balance badge (`restaurant_owner` only, reuses
`liveWalletBalance` + `walletBadgeClass`, same `.toFixed(2)` MAD format),
store-open toggle (`restaurant_owner` + `cashier`, reuses
`toggleStoreStatus` + the same three-state label/color logic), and a
compact icon-only sign-out button (`@click="$emit('logout')"`, reuses `t('Sign
Out')` as its `aria-label`/title even though only an icon is shown) — added
per approval, since neither Settings nor a nav row exists in this shell to
otherwise expose it.

**Bottom tab bar** — fixed to viewport bottom, `dir` respects
`currentLang` same as desktop nav. Tab set, using the SAME
`translations`/`t()` keys as desktop (no new i18n keys):

- `cashier` and `restaurant_owner` (same set for both): Overview, Active
  Orders, Menu Management, Deliveries (folds "Delivery Agents" + the
  existing "Deliveries" view under one tab, with an in-view toggle between
  the two — implemented as a small local `ref` inside `MobileAppShell`,
  e.g. `mobileDeliveriesSubView`, defaulting to `'deliveries'`, that picks
  which of `DriversManager`/`DeliveryManager` `currentView` gets set to
  when that tab is active). 4 tabs total.
- `admin` never reaches this component (see `Dashboard.js` template above)
  — no tab set needs defining for it here.
- Settings, Billing, Audit Logs, Restaurants Admin, Insights, Boost
  Campaigns: excluded from the tab bar, deliberately, per product decision
  (desktop-only for this phase).

**Tab-tap handler — the one behavior to get right**: each tab button's
click handler must go through the exact same setters the desktop nav uses,
not a fresh one that skips side effects:
- Overview / Menu / (Deliveries fold's two sub-targets) tabs: `currentView
  = '<view>'` — same as desktop's plain buttons.
  - The active/current tab is not just `currentView === 'overview'` etc.:
    for the Deliveries tab specifically, "active" should highlight when
    `currentView` is either `'drivers'` or `'deliveries'` (both sub-views
    of the fold), since a bottom tab bar has exactly one active item and
    both sub-views logically belong to the same tab.
- **Active Orders tab: must call `navigateToOrders()`, not a bare
  `currentView = 'orders'`** — `navigateToOrders()` is the one that also
  zeroes `unreadOrderCount`. A handler that just sets `currentView`
  directly would silently stop clearing the unread badge on mobile. Mirror
  desktop's `@click="navigateToOrders"` exactly.
- Content area below the tab bar: `<component :is="currentComponent"
  :user="user" :lang="currentLang" :t="t" @logout="$emit('logout')">`,
  same as desktop, registering the same 4 view components it can route to
  (`Overview`, `OrdersManager`, `MenuManager`, `DriversManager`,
  `DeliveryManager`) plus nothing else (no `Settings`/`Billing`/etc. — those
  views are simply unreachable from this shell's UI, `currentComponent`'s
  `default: return "Overview"` case covers any stray state safely).

Role gating on each tab mirrors the existing desktop `v-if` checks exactly
(`['restaurant_owner', 'cashier'].includes(user.role)` for
Orders/Menu/Deliveries — both roles get the same 4-tab set per the phase-1
tab list above, so in practice no per-tab role branching is needed *within*
`MobileAppShell` beyond what's already guaranteed by `admin` never
reaching this component and `kitchen_staff` never reaching this component).

## PR requirements

Description must list every new/moved file, confirm desktop rendering is
unchanged (DOM diff or screenshot), and confirm `admin` never receives
`MobileAppShell` regardless of viewport/pointer (point at the `v-else-if`
condition in `Dashboard.js` as the structural guarantee, not a runtime
check).
