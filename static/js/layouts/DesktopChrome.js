import { inject } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import Overview from '../views/Overview.js';
import RestaurantsAdmin from '../views/RestaurantsAdmin.js';
import MenuManager from '../views/MenuManager.js';
import DriversManager from '../views/DriversManager.js';
import OrdersManager from '../views/OrdersManager.js';
import DeliveryManager from '../views/DeliveryManager.js';
import StaffManager from '../views/StaffManager.js';
import AuditLog from '../views/AuditLog.js';
import Settings from '../views/Settings.js';
import Billing from '../views/Billing.js';
import SuperAdminInsights from '../views/SuperAdminInsights.js';

export default {
  name: 'DesktopChrome',
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
  emits: ['logout'],
  setup() {
    const t = inject('t');
    const currentLang = inject('currentLang');
    const shell = inject('dashboardShell');
    return { t, currentLang, ...shell };
  },
};
