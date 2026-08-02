import { ref, computed } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
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
                            <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm mr-3">
                                <span class="text-white font-bold text-lg leading-none">G</span>
                            </div>
                            <h1 class="text-xl font-bold text-slate-900 tracking-tight">GEQO Dashboard</h1>
                        </div>
                        <div class="flex items-center space-x-4">
                            <div class="hidden sm:flex flex-col items-end">
                                <span class="text-sm font-medium text-slate-900">{{ user.email }}</span>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 mt-0.5 uppercase tracking-wider">{{ formatRole(user.role) }}</span>
                                <span v-if="user.role === 'restaurant_owner'" 
                                      class="text-xs font-bold px-2 py-0.5 rounded-full mt-0.5 whitespace-nowrap"
                                      :class="user.wallet_balance > 20 ? 'bg-emerald-50 text-emerald-600' : (user.wallet_balance >= 0 ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600')">
                                    Wallet: {{ (user.wallet_balance || 0).toFixed(2) }} MAD {{ user.wallet_balance < 0 ? '(Grace)' : '' }}
                                </span>
                                </div>
                            </div>
                            <div class="w-px h-8 bg-slate-200 hidden sm:block"></div>
                            <button @click="$emit('logout')" class="text-sm font-semibold text-slate-500 hover:text-red-650 transition-colors px-2.5 py-1 rounded-lg hover:bg-slate-100">
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
                                @click="handleNavClick('Overview', 'overview')"
                                :class="!isFeatureEnabled('overview') ? 'opacity-50 text-slate-400 cursor-not-allowed bg-slate-50/50' : (currentView === 'overview' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium')"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap flex items-center gap-1.5">
                            <span v-if="!isFeatureEnabled('overview')">🔒</span>
                            Overview
                        </button>
                        
                        <!-- Active Orders: Owner, Cashier (NOT Admin) -->
                        <button v-if="['restaurant_owner', 'cashier'].includes(user.role)"
                                @click="handleNavClick('orders')"
                                :class="currentView === 'orders' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap relative flex items-center gap-1.5">
                            Active Orders
                            <span class="absolute top-2 right-1.5 flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </button>

                        <!-- Restaurants Admin: Admin only -->
                        <button v-if="user.role === 'admin'"
                                @click="handleNavClick('restaurants')"
                                :class="currentView === 'restaurants' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap flex items-center gap-1.5">
                            Restaurants Admin
                        </button>

                        <!-- Menu Management: Owner, Cashier (Removed Admin) -->
                        <button v-if="['restaurant_owner', 'cashier'].includes(user.role)"
                                @click="handleNavClick('menu')"
                                :class="currentView === 'menu' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap flex items-center gap-1.5">
                            Menu Management
                        </button>
                        
                        <!-- Staff Management: Owner only -->
                        <button v-if="user.role === 'restaurant_owner'"
                                @click="handleNavClick('Staff Management', 'staff')"
                                :class="!isFeatureEnabled('staff') ? 'opacity-50 text-slate-400 cursor-not-allowed bg-slate-50/50' : (currentView === 'staff' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium')"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap flex items-center gap-1.5">
                            <span v-if="!isFeatureEnabled('staff')">🔒</span>
                            Staff Management
                        </button>

                        <!-- Delivery Agents: Owner, Cashier -->
                        <button v-if="['restaurant_owner', 'cashier'].includes(user.role)"
                                @click="handleNavClick('Delivery Agents', 'drivers')"
                                :class="!isFeatureEnabled('drivers') ? 'opacity-50 text-slate-400 cursor-not-allowed bg-slate-50/50' : (currentView === 'drivers' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium')"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap flex items-center gap-1.5">
                            <span v-if="!isFeatureEnabled('drivers')">🔒</span>
                            Delivery Agents
                        </button>

                        <!-- Audit Logs: Admin, Owner -->
                        <button v-if="['admin', 'restaurant_owner'].includes(user.role)"
                                @click="handleNavClick('Audit Logs', 'audit_logs')"
                                :class="!isFeatureEnabled('audit_logs') ? 'opacity-50 text-slate-400 cursor-not-allowed bg-slate-50/50' : (currentView === 'audit-log' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium')"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap flex items-center gap-1.5">
                            <span v-if="!isFeatureEnabled('audit_logs')">🔒</span>
                            Audit Logs
                        </button>

                        <!-- Billing: Owner -->
                        <button v-if="['restaurant_owner'].includes(user.role)"
                                @click="handleNavClick('Billing', 'billing')"
                                :class="currentView === 'billing' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap flex items-center gap-1.5">
                            💳 Billing
                        </button>
                    </div>
                </div>
            </nav>

            <!-- Content Area (Full screen class applied for kitchen staff monitor) -->
            <main :class="user.role === 'kitchen_staff' ? 'flex-1 flex flex-col h-screen min-h-0 bg-slate-950 p-0 m-0' : 'flex-1 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full'">
                <component :is="currentComponent" :user="user" @logout="$emit('logout')"></component>
            </main>

            <!-- Floating Settings Button (Bottom Left) -->
            <button v-if="user.role !== 'kitchen_staff'"
                    @click="handleNavClick('Settings', 'settings')"
                    class="fixed bottom-6 left-6 z-40 p-3 rounded-full shadow-lg border transition-all flex items-center justify-center group bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                    :class="currentView === 'settings' ? '!bg-blue-600 !text-white !border-blue-600 shadow-blue-500/30' : ''">
                <svg class="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
            </button>

            <!-- Locked Feature Notification Toast -->
            <transition name="fade">
                <div v-if="showLockNotice" class="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white px-5 py-4 rounded-xl shadow-2xl border border-slate-700/50 backdrop-blur-md max-w-sm flex items-start gap-3 animate-slide-up">
                    <div class="text-xl leading-none mt-0.5">🔒</div>
                    <div>
                        <h4 class="font-bold text-sm text-slate-100">Feature Locked</h4>
                        <p class="text-xs text-slate-400 mt-1">
                            "{{ lockedFeatureName }}" is locked for the current release. The dashboard is currently focused on Active Orders & Menu.
                        </p>
                        <button @click="showLockNotice = false" class="text-[10px] uppercase font-bold tracking-wider text-amber-500 hover:text-amber-400 mt-2 transition-colors">
                            Dismiss
                        </button>
                    </div>
                </div>
            </transition>
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
        const isFeatureEnabled = (featureName) => {
            // Admin users bypass all feature flags
            if (props.user.role === 'admin') return true;
            if (!props.user.feature_flags) return true;
            return !!props.user.feature_flags[featureName];
        };

        const defaultView = props.user.role === 'kitchen_staff'
            ? 'kitchen-monitor'
            : (isFeatureEnabled('overview') ? 'overview' : 'orders');
        const currentView = ref(defaultView);

        const showLockNotice = ref(false);
        const lockedFeatureName = ref('');
        let noticeTimeout = null;

        const handleNavClick = (viewName, featureName) => {
            if (featureName && !isFeatureEnabled(featureName)) {
                if (noticeTimeout) clearTimeout(noticeTimeout);
                lockedFeatureName.value = viewName;
                showLockNotice.value = true;
                noticeTimeout = setTimeout(() => {
                    showLockNotice.value = false;
                }, 4000);
                return;
            }
            
            // Map common display names to view keys properly
            if (viewName === 'orders') currentView.value = 'orders';
            else if (viewName === 'menu') currentView.value = 'menu';
            else if (viewName === 'restaurants') currentView.value = 'restaurants';
            else if (viewName === 'Overview') currentView.value = 'overview';
            else if (viewName === 'Staff Management') currentView.value = 'staff';
            else if (viewName === 'Delivery Agents' || viewName === 'Drivers') currentView.value = 'drivers';
            else if (viewName === 'Audit Logs') currentView.value = 'audit-log';
            else if (viewName === 'Settings') currentView.value = 'settings';
            else if (viewName === 'Billing') currentView.value = 'billing';
        };

        const currentComponent = computed(() => {
            const role = props.user.role;
            const view = currentView.value;

            if (role === 'kitchen_staff') return 'KitchenMonitor';

            if (view === 'overview' && ['admin', 'restaurant_owner', 'cashier'].includes(role) && isFeatureEnabled('overview')) return 'Overview';
            if (view === 'orders' && ['restaurant_owner', 'cashier'].includes(role)) return 'OrdersManager';
            if (view === 'restaurants' && role === 'admin') return 'RestaurantsAdmin';
            if (view === 'menu' && ['admin', 'restaurant_owner', 'cashier'].includes(role)) return 'MenuManager';
            if (view === 'staff' && role === 'restaurant_owner' && isFeatureEnabled('staff')) return 'StaffManager';
            if (view === 'drivers' && ['admin', 'restaurant_owner', 'cashier'].includes(role) && isFeatureEnabled('drivers')) return 'DriversManager';
            if (view === 'audit-log' && ['admin', 'restaurant_owner'].includes(role) && isFeatureEnabled('audit_logs')) return 'AuditLog';
            if (view === 'settings') return 'Settings';
            if (view === 'billing' && ['admin', 'restaurant_owner'].includes(role)) return 'Billing';
            
            return isFeatureEnabled('overview') ? 'Overview' : 'OrdersManager';
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
            isFeatureEnabled,
            handleNavClick,
            showLockNotice,
            lockedFeatureName
        };
    }
}
