import { ref, computed, onMounted, onUnmounted, provide } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { api } from '../api.js';
import Overview from './Overview.js';
import RestaurantsAdmin from './RestaurantsAdmin.js';
import MenuManager from './MenuManager.js';
import DriversManager from './DriversManager.js';
import OrdersManager from './OrdersManager.js';
import DeliveryManager from './DeliveryManager.js';
import StaffManager from './StaffManager.js';
import KitchenMonitor from './KitchenMonitor.js';
import AuditLog from './AuditLog.js';
import Settings from './Settings.js';
import Billing from './Billing.js';
import SuperAdminInsights from './SuperAdminInsights.js';

const translations = {
    'en': {
        'Overview': 'Overview',
        'Active Orders': 'Active Orders',
        'Restaurants Admin': 'Restaurants Admin',
        'Menu Management': 'Menu Management',
        'Staff Management': 'Staff Management',
        'Delivery Agents': 'Delivery Agents',
        'Deliveries': 'Deliveries',
        'Audit Logs': 'Audit Logs',
        '💳 Billing': '💳 Billing',
        '📊 Insights & Rapports': '📊 Insights & Reports',
        'Sign Out': 'Sign Out'
    },
    'fr': {
        'Overview': 'Aperçu',
        'Active Orders': 'Commandes Actives',
        'Restaurants Admin': 'Admin Restaurants',
        'Menu Management': 'Gestion Menu',
        'Staff Management': 'Gestion Personnel',
        'Delivery Agents': 'Livreurs',
        'Deliveries': 'Livraisons',
        'Audit Logs': 'Journaux d\'Audit',
        '💳 Billing': '💳 Facturation',
        '📊 Insights & Rapports': '📊 Insights & Rapports',
        'Sign Out': 'Déconnexion'
    },
    'ar': {
        'Overview': 'نظرة عامة',
        'Active Orders': 'الطلبات النشطة',
        'Restaurants Admin': 'إدارة المطاعم',
        'Menu Management': 'إدارة القائمة',
        'Staff Management': 'إدارة الموظفين',
        'Delivery Agents': 'عمال التوصيل',
        'Deliveries': 'التوصيلات',
        'Audit Logs': 'سجلات التدقيق',
        '💳 Billing': '💳 الفواتير',
        '📊 Insights & Rapports': '📊 التقارير',
        'Sign Out': 'تسجيل الخروج'
    }
};

export default {
    template: `
        <div class="min-h-screen bg-slate-50 flex flex-col">
            <!-- Header (Hidden for Kitchen Monitor) -->
            <header v-if="user.role !== 'kitchen_staff'" class="bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center h-16">
                        <button @click="currentView = 'overview'" class="flex items-center hover:opacity-80 transition-opacity">
                            <img src="/img/geqo-emblem.svg" alt="GEQO" class="w-8 h-8 mr-3 rounded shadow-sm object-contain" />
                            <h1 class="text-xl font-bold text-[#FAFAFA] tracking-tight">GEQO</h1>
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
                        <button v-if="['restaurant_owner', 'admin'].includes(user.role)"
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

                        <!-- Deliveries: Admin, Owner, Cashier -->
                        <button v-if="['admin', 'restaurant_owner', 'cashier'].includes(user.role)"
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

                        <!-- Insights & Reports: Admin ONLY -->
                        <button v-if="user.role === 'admin'"
                                @click="currentView = 'insights'"
                                :class="currentView === 'insights' ? 'bg-amber-500 text-white font-semibold shadow-sm shadow-amber-500/30' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'"
                                class="px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap">
                            {{ t('📊 Insights & Rapports') }}
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
        KitchenMonitor,
        AuditLog,
        Settings,
        Billing,
        SuperAdminInsights,
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

        // Language Switcher (Trilingual)
        const currentLang = ref(localStorage.getItem('geqo_admin_lang') || 'fr');
        const setLanguage = (lang) => {
            currentLang.value = lang;
            localStorage.setItem('geqo_admin_lang', lang);
            document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
            document.documentElement.lang = lang;
        };

        const t = (key) => {
            const lang = currentLang.value;
            if (translations[lang] && translations[lang][key]) {
                return translations[lang][key];
            }
            return key;
        };

        provide('t', t);
        provide('currentLang', currentLang);

        // Live wallet balance — fetched from API on mount, not from stale localStorage
        const liveWalletBalance = ref(props.user.wallet_balance || 0);
        const isAcceptingOrders = ref(props.user.is_accepting_orders ?? true);
        const isOpenBySchedule = ref(true); // Computed from backend is_open field

        const fetchLiveBalance = async () => {
            try {
                const res = await api.get('/admin/me');
                liveWalletBalance.value = res.data.wallet_balance || 0;
                isAcceptingOrders.value = res.data.is_accepting_orders ?? true;
            } catch (err) {
                console.warn('[Dashboard] Failed to fetch live wallet balance', err);
            }
            // Also poll is_open (operating hours) via the dashboard endpoint
            try {
                const dashRes = await api.get('/admin/restaurant/dashboard');
                const r = dashRes.data?.restaurant;
                if (r !== undefined) {
                    // is_open is the computed field (manual toggle + hours check)
                    isOpenBySchedule.value = r.is_open !== false;
                }
            } catch (err) { /* non-blocking */ }
        };

        const toggleStoreStatus = async () => {
            try {
                const newValue = !isAcceptingOrders.value;
                await api.put('/dashboard/restaurant/status', { is_accepting_orders: newValue });
                isAcceptingOrders.value = newValue;
            } catch (err) {
                console.error('[Dashboard] Failed to toggle store status', err);
                alert('Failed to update store status. Please try again.');
            }
        };

        onMounted(() => {
            setLanguage(currentLang.value);
            if (['restaurant_owner', 'admin'].includes(props.user.role)) {
                fetchLiveBalance();
            }
            // Boot global WebSocket for real-time order alerts
            if (['restaurant_owner', 'cashier'].includes(props.user.role)) {
                initGlobalWebSocket();
            }
        });

        onUnmounted(() => {
            if (_globalWs) _globalWs.close();
            if (_audioCtx) _audioCtx.close();
        });

        const walletBadgeClass = computed(() => {
            if (liveWalletBalance.value > 20) return 'bg-emerald-100 text-emerald-800';
            if (liveWalletBalance.value >= 0) return 'bg-amber-100 text-amber-800';
            return 'bg-red-100 text-red-800';
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
            if (_audioCtx.state === 'suspended') _audioCtx.resume();
            _audioUnlocked = true;
            document.body.removeEventListener('click', unlockAudio);
            document.body.removeEventListener('touchstart', unlockAudio);
        };
        document.body.addEventListener('click', unlockAudio, { once: true });
        document.body.addEventListener('touchstart', unlockAudio, { once: true });

        const playAlertSound = () => {
            try {
                if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                if (_audioCtx.state === 'suspended') _audioCtx.resume();
                const beep = (freq, startTime, duration) => {
                    const osc = _audioCtx.createOscillator();
                    const gain = _audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(_audioCtx.destination);
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.2, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                    osc.start(startTime);
                    osc.stop(startTime + duration);
                };
                const t = _audioCtx.currentTime;
                beep(880, t, 0.12);
                beep(1100, t + 0.15, 0.12);
                beep(880, t + 0.30, 0.14);
            } catch (e) {
                console.warn('[Dashboard] Audio alert failed:', e);
            }
        };

        const initGlobalWebSocket = () => {
            if (!props.user?.restaurant_id) return;
            const token = localStorage.getItem('token');
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const proto = isLocal ? 'ws:' : 'wss:';
            const host = isLocal ? 'localhost:8000' : 'api.mygeqo.com';
            const url = `${proto}//${host}/api/v1/dashboard/ws/${props.user.restaurant_id}`;
            const isRealToken = token && token !== 'cookie';
            _globalWs = isRealToken ? new WebSocket(url, [`bearer.${token}`]) : new WebSocket(url);

            _globalWs.onopen = () => { _globalWsRetry = 0; };
            _globalWs.onclose = (ev) => {
                if (ev.code === 4001 || ev.code === 4003) return;
                _globalWsRetry++;
                const delay = Math.min(30000, Math.pow(2, _globalWsRetry) * 1000 + Math.random() * 800);
                setTimeout(initGlobalWebSocket, delay);
            };
            _globalWs.onmessage = (ev) => {
                try {
                    const data = JSON.parse(ev.data);
                    if (data.event === 'NEW_ORDER') {
                        // Only increment badge if user is NOT already on orders tab
                        if (currentView.value !== 'orders') {
                            unreadOrderCount.value++;
                        }
                        playAlertSound();
                    }
                } catch { }
            };
        };

        const navigateToOrders = () => {
            currentView.value = 'orders';
            unreadOrderCount.value = 0;
        };
        // ────────────────────────────────────────────────────────────────────

        const currentComponent = computed(() => {
            const role = props.user.role;
            const view = currentView.value;

            if (role === 'kitchen_staff') return 'KitchenMonitor';

            switch (view) {
                case 'overview': return 'Overview';
                case 'orders': return 'OrdersManager';
                case 'deliveries': return 'DeliveryManager';
                case 'restaurants': return role === 'admin' ? 'RestaurantsAdmin' : 'Overview';
                case 'menu': return 'MenuManager';
                case 'staff': return 'StaffManager';
                case 'drivers': return 'DriversManager';
                case 'audit-log': return 'AuditLog';
                case 'settings': return 'Settings';
                case 'billing': return 'Billing';
                case 'insights': return role === 'admin' ? 'SuperAdminInsights' : 'Overview';
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
}
