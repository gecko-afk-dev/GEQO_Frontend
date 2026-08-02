import { ref, computed, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { api } from '../api.js';
import Overview from './Overview.js';
import RestaurantsAdmin from './RestaurantsAdmin.js';
import MenuManager from './MenuManager.js';
import DriversManager from './DriversManager.js';
import OrdersManager from './OrdersManager.js';
import StaffManager from './StaffManager.js';
import KitchenMonitor from './KitchenMonitor.js';
import AuditLog from './AuditLog.js';
import Settings from './Settings.js';
import Billing from './Billing.js';

export default {
    template: `
        <div class="min-h-screen bg-slate-50 flex flex-col">
            <!-- Header (Hidden for Kitchen Monitor) -->
            <header v-if="user.role !== 'kitchen_staff'" class="bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center h-16">
                        <div class="flex items-center">
                            <div class="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm mr-3">
                                <span class="text-white font-bold text-lg leading-none">G</span>
                            </div>
                            <h1 class="text-xl font-bold text-slate-900 tracking-tight">GEQO Dashboard</h1>
                        </div>
                        <div class="flex items-center space-x-4">
                            <div class="hidden sm:flex flex-col items-end">
                                <span class="text-sm font-medium text-slate-900">{{ user.email }}</span>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 mt-0.5 uppercase tracking-wider">{{ formatRole(user.role) }}</span>
                                    <span v-if="['restaurant_owner', 'admin'].includes(user.role)"
                                          class="text-xs font-bold px-2.5 py-0.5 rounded-full mt-0.5 whitespace-nowrap"
                                          :class="walletBadgeClass">
                                        {{ liveWalletBalance.toFixed(2) }} MAD
                                    </span>
                                </div>
                            </div>
                            <div class="w-px h-8 bg-slate-200 hidden sm:block"></div>
                            <button @click="$emit('logout')" class="text-sm font-semibold text-slate-500 hover:text-red-600 transition-colors px-2.5 py-1 rounded-lg hover:bg-slate-100">
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Navigation (Hidden for Kitchen Monitor) -->
            <nav v-if="user.role !== 'kitchen_staff'" class="bg-white border-b border-slate-200 shadow-sm shrink-0">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex space-x-1 py-3 overflow-x-auto hide-scrollbar">
                        <!-- Overview: Admin, Owner, Cashier -->
                        <button v-if="['admin', 'restaurant_owner', 'cashier'].includes(user.role)"
                                @click="currentView = 'overview'"
                                :class="currentView === 'overview' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap">
                            Overview
                        </button>

                        <!-- Active Orders: Owner, Cashier -->
                        <button v-if="['restaurant_owner', 'cashier'].includes(user.role)"
                                @click="currentView = 'orders'"
                                :class="currentView === 'orders' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap relative">
                            Active Orders
                            <span class="absolute top-2 right-1.5 flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </button>

                        <!-- Restaurants Admin: Admin only -->
                        <button v-if="user.role === 'admin'"
                                @click="currentView = 'restaurants'"
                                :class="currentView === 'restaurants' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap">
                            Restaurants Admin
                        </button>

                        <!-- Menu Management: Owner, Cashier -->
                        <button v-if="['restaurant_owner', 'cashier'].includes(user.role)"
                                @click="currentView = 'menu'"
                                :class="currentView === 'menu' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap">
                            Menu Management
                        </button>

                        <!-- Staff Management: Owner only -->
                        <button v-if="['restaurant_owner', 'admin'].includes(user.role)"
                                @click="currentView = 'staff'"
                                :class="currentView === 'staff' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap">
                            Staff Management
                        </button>

                        <!-- Delivery Agents: Owner, Cashier -->
                        <button v-if="['restaurant_owner', 'cashier'].includes(user.role)"
                                @click="currentView = 'drivers'"
                                :class="currentView === 'drivers' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap">
                            Delivery Agents
                        </button>

                        <!-- Audit Logs: Admin, Owner -->
                        <button v-if="['admin', 'restaurant_owner'].includes(user.role)"
                                @click="currentView = 'audit-log'"
                                :class="currentView === 'audit-log' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap">
                            Audit Logs
                        </button>

                        <!-- Billing: Owner ONLY -->
                        <button v-if="['restaurant_owner', 'admin'].includes(user.role)"
                                @click="currentView = 'billing'"
                                :class="currentView === 'billing' ? 'bg-emerald-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap">
                            💳 Billing
                        </button>
                    </div>
                </div>
            </nav>

            <!-- Content Area -->
            <main :class="user.role === 'kitchen_staff' ? 'flex-1 flex flex-col h-screen min-h-0 bg-slate-950 p-0 m-0' : 'flex-1 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full'">
                <component :is="currentComponent" :user="user" @logout="$emit('logout')"></component>
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
        </div>
    `,
    components: {
        Overview,
        RestaurantsAdmin,
        MenuManager,
        DriversManager,
        OrdersManager,
        StaffManager,
        KitchenMonitor,
        AuditLog,
        Settings,
        Billing
    },
    props: {
        user: Object
    },
    emits: ['logout'],
    setup(props) {
        const defaultView = props.user.role === 'kitchen_staff'
            ? 'kitchen-monitor'
            : 'overview';
        const currentView = ref(defaultView);

        // Live wallet balance — fetched from API on mount, not from stale localStorage
        const liveWalletBalance = ref(props.user.wallet_balance || 0);

        const fetchLiveBalance = async () => {
            try {
                const res = await api.get('/admin/me');
                liveWalletBalance.value = res.data.wallet_balance || 0;
            } catch (err) {
                console.warn('[Dashboard] Failed to fetch live wallet balance', err);
            }
        };

        onMounted(() => {
            if (['restaurant_owner', 'admin'].includes(props.user.role)) {
                fetchLiveBalance();
            }
        });

        const walletBadgeClass = computed(() => {
            if (liveWalletBalance.value > 20) return 'bg-emerald-100 text-emerald-800';
            if (liveWalletBalance.value >= 0) return 'bg-amber-100 text-amber-800';
            return 'bg-red-100 text-red-800';
        });

        const currentComponent = computed(() => {
            const role = props.user.role;
            const view = currentView.value;

            if (role === 'kitchen_staff') return 'KitchenMonitor';

            switch (view) {
                case 'overview': return 'Overview';
                case 'orders': return 'OrdersManager';
                case 'restaurants': return role === 'admin' ? 'RestaurantsAdmin' : 'Overview';
                case 'menu': return 'MenuManager';
                case 'staff': return 'StaffManager';
                case 'drivers': return 'DriversManager';
                case 'audit-log': return 'AuditLog';
                case 'settings': return 'Settings';
                case 'billing': return 'Billing';
                default: return 'Overview';
            }
        });

        const formatRole = (role) => {
            if (role === 'restaurant_owner') return 'Owner';
            if (role === 'kitchen_staff') return 'Kitchen Staff';
            return role;
        };

        return {
            currentView,
            currentComponent,
            formatRole,
            liveWalletBalance,
            walletBadgeClass
        };
    }
}
