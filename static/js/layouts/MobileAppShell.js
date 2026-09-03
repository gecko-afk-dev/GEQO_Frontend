import { inject, ref } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import Overview from '../views/Overview.js';
import OrdersManager from '../views/OrdersManager.js';
import MenuManager from '../views/MenuManager.js';
import DriversManager from '../views/DriversManager.js';
import DeliveryManager from '../views/DeliveryManager.js';
import Settings from '../views/Settings.js';

export default {
  name: 'MobileAppShell',
  template: `
        <div class="min-h-screen bg-slate-50 flex flex-col">
            <!-- Top bar: logo, wallet badge, store-open toggle, language switcher, settings, sign out. No nav row (see bottom tab bar). -->
            <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0">
                <div class="flex justify-between items-center h-14 px-4">
                    <button @click="currentView = 'overview'" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <img src="/img/geqo-emblem.svg" alt="GEQO Setae Mark" class="w-7 h-7 rounded shadow-sm object-contain flex-shrink-0" />
                        <span class="text-lg font-extrabold tracking-tight text-slate-900" style="font-family: 'Space Grotesk', 'Plus Jakarta Sans', sans-serif; letter-spacing: -0.02em;">
                            GE<span style="color:#F59E0B;">QO</span>
                        </span>
                    </button>
                    <div class="flex items-center gap-1.5">
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
                        <div class="flex items-center bg-slate-100 rounded-lg p-0.5">
                            <button @click="setLanguage('en')" :class="currentLang === 'en' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'" class="px-1.5 py-1 rounded text-[9px] font-bold transition-colors">EN</button>
                            <button @click="setLanguage('fr')" :class="currentLang === 'fr' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'" class="px-1.5 py-1 rounded text-[9px] font-bold transition-colors">FR</button>
                            <button @click="setLanguage('ar')" :class="currentLang === 'ar' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'" class="px-1.5 py-1 rounded text-[9px] font-bold transition-colors">AR</button>
                        </div>
                        <button @click="currentView = 'settings'"
                                :title="t('Settings')"
                                :aria-label="t('Settings')"
                                class="p-2 rounded-lg transition-colors"
                                :class="currentView === 'settings' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
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
    Settings,
  },
  props: {
    user: Object,
  },
  emits: ['logout'],
  setup() {
    const t = inject('t');
    const currentLang = inject('currentLang');
    const shell = inject('dashboardShell');

    // Which sub-view the folded "Deliveries" tab shows; remembers the
    // last choice across taps on the tab itself.
    const mobileDeliveriesSubView = ref('deliveries');

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
