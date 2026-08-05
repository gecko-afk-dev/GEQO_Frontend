import {
    ref, computed, onMounted, onUnmounted, watch
} from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { api } from '../api.js';
import { createDashboardSocket } from '../ws.js';

export default {
    name: 'KitchenMonitor',
    template: `
        <div class="h-[calc(100vh-80px)] bg-[#0A0A0A] text-slate-100 flex flex-col font-sans select-none overflow-hidden relative">

            <!-- Screen-flash alert overlay (new order or urgency trigger) -->
            <div :class="flashScreen ? 'opacity-100' : 'opacity-0 pointer-events-none'"
                 class="absolute inset-0 bg-amber-500/10 z-50 transition-opacity duration-300 pointer-events-none">
            </div>

            <!-- ════════════════ HEADER ════════════════ -->
            <header class="bg-[#141414] border-b border-neutral-800 px-5 py-3.5 flex justify-between items-center z-10 shrink-0">
                <div class="flex items-center gap-4">
                    <div v-if="wsStatus === 'CONNECTED'" class="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded">
                        <div class="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                        <span class="text-[10px] font-black text-emerald-400 font-mono tracking-widest uppercase">LIVE</span>
                    </div>
                    <div v-else-if="wsStatus === 'FALLBACK'" class="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded">
                        <div class="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></div>
                        <span class="text-[10px] font-black text-amber-400 font-mono tracking-widest uppercase">SYNCING</span>
                    </div>
                    <div v-else class="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded">
                        <div class="h-2 w-2 rounded-full bg-red-500"></div>
                        <span class="text-[10px] font-black text-red-500 font-mono tracking-widest uppercase">OFFLINE</span>
                    </div>
                    <span class="text-xs font-black font-mono tracking-[0.2em] text-neutral-500 uppercase">MATRIX KDS</span>
                </div>

                <div class="flex items-center gap-4">
                    <div class="hidden sm:flex items-center gap-3 text-[10px] text-neutral-500 font-bold font-mono tracking-widest">
                        <span>PENDING: <span class="text-amber-500">{{ pendingOrders.length }}</span></span>
                        <span>PREP: <span class="text-blue-400">{{ preparingOrders.length }}</span></span>
                        <span>READY: <span class="text-emerald-400">{{ readyOrders.length }}</span></span>
                    </div>

                    <button @click="toggleSound"
                            class="px-3 py-1.5 border border-neutral-800 bg-[#1A1A1A] hover:bg-neutral-800 text-xs font-mono text-neutral-400 transition-all">
                        <span v-if="soundEnabled">🔊</span><span v-else>🔇</span>
                    </button>
                    <button @click="$emit('logout')"
                            class="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-[10px] font-black text-red-500 font-mono tracking-widest uppercase transition-all border border-red-500/20">
                        EXIT
                    </button>
                </div>
            </header>

            <!-- ════════════════ MOBILE TAB FILTER ════════════════ -->
            <div class="sm:hidden sticky top-0 z-20 bg-[#0A0A0A] border-b border-neutral-800 flex">
                <button v-for="tab in mobileTabs" :key="tab.key"
                        @click="activeTab = tab.key"
                        class="flex-1 py-4 text-[10px] font-black font-mono tracking-widest uppercase transition-all"
                        :class="activeTab === tab.key
                            ? 'text-' + tab.color + ' border-b-2 border-' + tab.color + ' bg-white/[0.02]'
                            : 'text-neutral-600 border-b-2 border-transparent'">
                    {{ tab.label }}
                </button>
            </div>

            <!-- ════════════════ MAIN AREA ════════════════ -->
            <main class="flex-1 overflow-hidden min-h-0">
                <div v-if="loading" class="h-full flex flex-col items-center justify-center gap-4">
                    <div class="text-[10px] font-mono tracking-widest text-neutral-500 animate-pulse">SYNCING MATRIX QUEUE...</div>
                </div>
                <div v-else-if="orders.length === 0" class="h-full flex flex-col items-center justify-center gap-4 text-center">
                    <h2 class="text-3xl font-black font-mono text-neutral-700 tracking-widest">QUEUE CLEAR</h2>
                </div>

                <!-- ── DESKTOP: 16-Column 4-Col Matrix Kanban ── -->
                <div v-else class="hidden sm:grid sm:grid-cols-16 gap-4 p-4 h-full">

                    <!-- PENDING (col-span-4) -->
                    <div class="col-span-4 flex flex-col overflow-hidden bg-[#141414] border border-neutral-800">
                        <div class="border-t-4 border-amber-500 px-4 py-3 flex items-center justify-between bg-[#1A1A1A] shrink-0">
                            <span class="text-[10px] font-black text-amber-500 font-mono tracking-widest uppercase">PENDING</span>
                            <span class="bg-amber-500/10 text-amber-500 text-xs font-mono px-2 py-0.5">{{ pendingOrders.length }}</span>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                            <div v-for="order in pendingOrders" :key="order.id" class="bg-[#1A1A1A] border transition-colors hover:border-amber-500/50 flex flex-col" :class="isUrgent(order) ? 'border-amber-500 animate-[urgencyPulse_1s_ease-in-out_infinite]' : 'border-neutral-800'">
                                <div v-html="renderTicketHeader(order, 'amber-500')"></div>
                                <div class="px-4 py-3 space-y-3 flex-1" v-html="renderTicketItems(order)"></div>
                                <div class="px-4 pb-4 shrink-0">
                                    <button @click="promptTransition(order, 'preparing')" class="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 font-black font-mono text-xs tracking-widest uppercase">
                                        ACCEPTER
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PREPARING (col-span-4) -->
                    <div class="col-span-4 flex flex-col overflow-hidden bg-[#141414] border border-neutral-800">
                        <div class="border-t-4 border-blue-500 px-4 py-3 flex items-center justify-between bg-[#1A1A1A] shrink-0">
                            <span class="text-[10px] font-black text-blue-400 font-mono tracking-widest uppercase">PREPARING</span>
                            <span class="bg-blue-500/10 text-blue-400 text-xs font-mono px-2 py-0.5">{{ preparingOrders.length }}</span>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                            <div v-for="order in preparingOrders" :key="order.id" class="bg-[#1A1A1A] border border-neutral-800 transition-colors hover:border-blue-500/50 flex flex-col">
                                <div v-html="renderTicketHeader(order, 'blue-400')"></div>
                                <div class="px-4 py-3 space-y-3 flex-1" v-html="renderTicketItems(order)"></div>
                                <div class="px-4 pb-4 shrink-0">
                                    <button @click="promptTransition(order, 'ready')" class="w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-black font-mono text-xs tracking-widest uppercase">
                                        PRÊT
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- READY (col-span-4) -->
                    <div class="col-span-4 flex flex-col overflow-hidden bg-[#141414] border border-neutral-800">
                        <div class="border-t-4 border-emerald-500 px-4 py-3 flex items-center justify-between bg-[#1A1A1A] shrink-0">
                            <span class="text-[10px] font-black text-emerald-400 font-mono tracking-widest uppercase">READY</span>
                            <span class="bg-emerald-500/10 text-emerald-400 text-xs font-mono px-2 py-0.5">{{ readyOrders.length }}</span>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                            <div v-for="order in readyOrders" :key="order.id" class="bg-[#1A1A1A] border border-neutral-800 transition-colors hover:border-emerald-500/50 flex flex-col">
                                <div v-html="renderTicketHeader(order, 'emerald-400')"></div>
                                <div class="px-4 py-3 space-y-3 flex-1" v-html="renderTicketItems(order)"></div>
                                <div class="px-4 pb-4 shrink-0 space-y-2">
                                    <select v-if="order.fulfillment_method === 'delivery'" v-model="selectedDrivers[order.id]" class="w-full bg-[#0A0A0A] border border-neutral-800 text-neutral-300 font-mono text-xs px-2 py-2 outline-none">
                                        <option value="">— Broadcast to Fleet —</option>
                                        <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }}</option>
                                    </select>
                                    <button @click="promptTransition(order, 'dispatched')" class="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black font-mono text-xs tracking-widest uppercase">
                                        {{ order.fulfillment_method === 'delivery' ? (selectedDrivers[order.id] ? 'LIVRER (ASSIGN)' : 'LIVRER (BROADCAST)') : 'LIVRÉ (PICKUP)' }}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- DELIVERED (col-span-4) -->
                    <div class="col-span-4 flex flex-col overflow-hidden bg-[#141414] border border-neutral-800">
                        <div class="border-t-4 border-neutral-600 px-4 py-3 flex items-center justify-between bg-[#1A1A1A] shrink-0">
                            <span class="text-[10px] font-black text-neutral-400 font-mono tracking-widest uppercase">DELIVERED/DISPATCHED</span>
                            <span class="bg-neutral-800/50 text-neutral-400 text-xs font-mono px-2 py-0.5">{{ deliveredOrders.length }}</span>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                            <div v-for="order in deliveredOrders" :key="order.id" class="bg-[#1A1A1A] border border-neutral-800 flex flex-col opacity-70">
                                <div v-html="renderTicketHeader(order, 'neutral-400')"></div>
                                <div class="px-4 py-3 space-y-3 flex-1" v-html="renderTicketItems(order)"></div>
                                <div class="px-4 pb-4 shrink-0">
                                    <div class="w-full py-3 bg-neutral-800/50 text-neutral-400 text-center font-black font-mono text-xs tracking-widest uppercase">
                                        {{ order.status }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ── MOBILE: single-column filtered list ── -->
                <div v-if="!loading && orders.length > 0" class="sm:hidden h-full overflow-y-auto p-4 space-y-4">
                    <template v-for="order in mobileVisibleOrders" :key="order.id">
                        <div class="bg-[#141414] border border-neutral-800">
                            <div v-html="renderTicketHeader(order, mobileColor(order.status))"></div>
                            <div class="px-4 py-3" v-html="renderTicketItems(order)"></div>
                            <div class="px-4 pb-4">
                                <button v-if="['received','accepted'].includes(order.status)" @click="promptTransition(order, 'preparing')" class="w-full py-3 bg-amber-500/10 text-amber-500 border border-amber-500/30 font-black font-mono text-xs tracking-widest uppercase">ACCEPTER</button>
                                <button v-else-if="order.status === 'preparing'" @click="promptTransition(order, 'ready')" class="w-full py-3 bg-blue-500/10 text-blue-400 border border-blue-500/30 font-black font-mono text-xs tracking-widest uppercase">PRÊT</button>
                                <button v-else-if="order.status === 'ready'" @click="promptTransition(order, 'dispatched')" class="w-full py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-black font-mono text-xs tracking-widest uppercase">LIVRÉ</button>
                            </div>
                        </div>
                    </template>
                </div>
            </main>

            <!-- ════════════════ CONFIRMATION BOTTOM SHEET ════════════════ -->
            <template v-if="pendingTransition">
                <div class="absolute inset-0 bg-black/80 z-40" @click="pendingTransition = null"></div>
                <div class="absolute bottom-0 left-0 right-0 bg-[#1A1A1A] border-t border-neutral-800 p-6 z-50">
                    <h3 class="text-sm font-black font-mono text-neutral-200 tracking-widest uppercase mb-4">Confirm Matrix State Transfer</h3>
                    <p class="text-sm text-neutral-400 mb-6 font-mono">
                        Transfer TICKET #{{ pendingTransition.order.tracking_code || pendingTransition.order.id }}
                        to STATE: <span :class="'text-' + transitionColor" class="font-black">[{{ pendingTransitionLabel }}]</span>?
                    </p>
                    <div class="flex gap-3">
                        <button @click="pendingTransition = null" class="flex-1 py-3 border border-neutral-700 font-mono text-xs font-black tracking-widest uppercase hover:bg-neutral-800">Cancel</button>
                        <button @click="executeTransition" class="flex-1 py-3 border border-amber-500/30 bg-amber-500/10 text-amber-500 font-mono text-xs font-black tracking-widest uppercase hover:bg-amber-500/20">Confirm</button>
                    </div>
                </div>
            </template>
        </div>
    `,
    props: ['user', 'lang'],
    emits: ['logout'],

    setup(props) {
        const orders        = ref([]);
        const drivers       = ref([]);
        const loading       = ref(true);
        const wsStatus      = ref('DISCONNECTED');
        const soundEnabled  = ref(true);
        const flashScreen   = ref(false);
        const now           = ref(new Date());
        const activeTab     = ref('pending');
        const selectedDrivers = ref({});
        const pendingTransition = ref(null);

        let ws    = null;
        let timer = null;
        let pollingTimer = null;
        
        const getItemName = (item) => {
            if (!item) return 'Article Inconnu';
            const lang = props.lang || 'fr';
            if (item.menu_item) {
                if (lang === 'fr' && item.menu_item.name_fr) return item.menu_item.name_fr;
                if (lang === 'ar' && item.menu_item.name_ar) return item.menu_item.name_ar;
                if (item.menu_item.name_en) return item.menu_item.name_en;
                if (item.menu_item.name) return item.menu_item.name;
            }
            if (lang === 'fr' && item.name_fr) return item.name_fr;
            if (lang === 'ar' && item.name_ar) return item.name_ar;
            if (item.name_en) return item.name_en;
            if (item.menu_item_name) return item.menu_item_name;
            if (item.item_name) return item.item_name;
            if (typeof item.name === 'string' && item.name.trim() !== '') return item.name;
            return `Article #${item.id || item.menu_item_id || '1'}`;
        };

        const pendingOrders = computed(() =>
            [...orders.value.filter(o => ['received', 'accepted'].includes(o.status))]
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        );
        const preparingOrders = computed(() =>
            [...orders.value.filter(o => o.status === 'preparing')]
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        );
        const readyOrders = computed(() =>
            [...orders.value.filter(o => o.status === 'ready')]
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        );
        const deliveredOrders = computed(() =>
            [...orders.value.filter(o => ['dispatched', 'delivered'].includes(o.status))]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) // newest first
                .slice(0, 10) // Limit to 10 in UI
        );

        const mobileTabs = computed(() => [
            { key: 'pending',  label: 'PENDING',  color: 'amber-500' },
            { key: 'preparing', label: 'PREP', color: 'blue-400' },
            { key: 'ready',     label: 'READY',  color: 'emerald-400' },
        ]);

        const mobileVisibleOrders = computed(() => {
            if (activeTab.value === 'pending')  return pendingOrders.value;
            if (activeTab.value === 'preparing') return preparingOrders.value;
            return readyOrders.value;
        });

        const mobileColor = (status) => {
            if (['received','accepted'].includes(status)) return 'amber-500';
            if (status === 'preparing') return 'blue-400';
            return 'emerald-400';
        };

        const isUrgent = (order) => {
            const mins = Math.floor((now.value - new Date(order.created_at)) / 60000);
            return mins >= 10 && ['received','accepted'].includes(order.status);
        };

        const getElapsedTime = (created_at) => {
            const utcStr = created_at.endsWith('Z') ? created_at : created_at + 'Z';
            const mins = Math.floor((now.value - new Date(utcStr)) / 60000);
            if (mins < 1) return '0 min';
            return `${mins} min`;
        };

        const renderTicketHeader = (order, textColor) => {
            const elapsed = getElapsedTime(order.created_at);
            const timeClass = isUrgent(order) ? 'text-red-500' : 'text-neutral-400';
            const method = order.fulfillment_method === 'delivery' ? 'DELIVERY' : 'PICKUP';
            return `
                <div class="px-4 py-3 border-b border-neutral-800 flex justify-between items-start bg-[#141414]">
                    <div>
                        <span class="text-2xl font-black font-mono text-${textColor}">#${order.tracking_code || order.id}</span>
                        <div class="text-[10px] font-mono tracking-widest text-neutral-500 mt-1">${method}</div>
                    </div>
                    <div class="text-right">
                        <span class="text-xs font-mono font-bold ${timeClass}">${elapsed}</span>
                    </div>
                </div>
            `;
        };

        const renderTicketItems = (order) => {
            return (order.items || []).map(item => {
                const modsHtml = (item.modifiers || []).map(m =>
                    `<div class="text-amber-400 font-medium text-sm pl-4">+ ${m.name_fr || m.name_en || ''}</div>`
                ).join('');
                const exclusionsHtml = (item.exclusions || []).map(e =>
                    `<div class="text-red-400 font-medium text-sm pl-4">- SANS ${e.ingredient_name.toUpperCase()}</div>`
                ).join('');
                return `
                    <div class="flex items-start gap-3">
                        <span class="text-lg font-black font-mono text-neutral-500 shrink-0">${item.quantity}x</span>
                        <div class="flex-1 min-w-0">
                            <div dir="auto" class="text-lg font-bold text-neutral-50 leading-tight font-sans">
                                ${getItemName(item)}
                            </div>
                            <div class="mt-1">${modsHtml}${exclusionsHtml}</div>
                        </div>
                    </div>`;
            }).join('');
        };

        const pendingTransitionLabel = computed(() => {
            if (!pendingTransition.value) return '';
            return pendingTransition.value.to.toUpperCase();
        });

        const transitionColor = computed(() => {
            if (!pendingTransition.value) return '';
            const map = { preparing: 'blue-400', ready: 'emerald-400', dispatched: 'emerald-400', delivered: 'neutral-400' };
            return map[pendingTransition.value.to] || 'amber-500';
        });

        const promptTransition = (order, to) => {
            pendingTransition.value = { order, to };
        };

        const executeTransition = async () => {
            if (!pendingTransition.value) return;
            const { order, to } = pendingTransition.value;
            pendingTransition.value = null;
            try {
                const payload = { new_status: to };
                if ((to === 'dispatched' || to === 'ready') && selectedDrivers.value[order.id]) {
                    payload.driver_id = selectedDrivers.value[order.id];
                }
                // If it's pickup and we're clicking dispatched, it should actually be delivered
                if (to === 'dispatched' && order.fulfillment_method === 'pickup') {
                    payload.new_status = 'delivered';
                }
                await api.post(`/dashboard/orders/${order.id}/status`, payload);
                await loadOrders();
            } catch (err) {
                console.error('[KDS] status update failed', err);
            }
        };

        const loadOrders = async () => {
            if (!props.user?.restaurant_id) return;
            try {
                const res = await api.get('/dashboard/orders/' + props.user.restaurant_id);
                const previousCount = orders.value.filter(o => ['received','accepted'].includes(o.status)).length;
                orders.value = res.data;
                const newCount = orders.value.filter(o => ['received','accepted'].includes(o.status)).length;
                if (newCount > previousCount && !loading.value) triggerAlertEffect();
            } catch (err) {
                console.error('[KDS] loadOrders error', err);
            } finally {
                loading.value = false;
            }
        };

        const loadDrivers = async () => {
            if (!props.user?.restaurant_id) return;
            try {
                const res = await api.get('/admin/drivers');
                drivers.value = res.data || [];
            } catch (err) {
                console.warn('[KDS] drivers load skipped', err);
            }
        };

        let reconnectAttempts = 0;
        const scheduleReconnect = () => {
            reconnectAttempts++;
            if (reconnectAttempts > 1 && wsStatus.value !== 'FALLBACK') {
                wsStatus.value = 'FALLBACK';
                if (!pollingTimer) {
                    pollingTimer = setInterval(() => loadOrders(), 10000);
                }
            } else if (wsStatus.value !== 'FALLBACK') {
                wsStatus.value = 'DISCONNECTED';
            }

            const delay = Math.min(30000, Math.pow(2, reconnectAttempts) * 1000 + Math.random() * 1000);
            setTimeout(initWebSocket, delay);
        };

        const initWebSocket = () => {
            if (!props.user?.restaurant_id) return;
            ws = createDashboardSocket(props.user.restaurant_id);
            ws.onopen = () => { 
                wsStatus.value = 'CONNECTED'; 
                reconnectAttempts = 0;
                if (pollingTimer) {
                    clearInterval(pollingTimer);
                    pollingTimer = null;
                }
            };
            ws.onclose = (event) => {
                if (wsStatus.value !== 'FALLBACK') wsStatus.value = 'DISCONNECTED';
                if (event.code === 4003) return;
                scheduleReconnect();
            };
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (['NEW_ORDER','ORDER_STATUS_UPDATED'].includes(data.event)) loadOrders();
                } catch { }
            };
        };

        const toggleSound = () => { soundEnabled.value = !soundEnabled.value; };
        const playAlertSound = () => {
            if (!soundEnabled.value) return;
            try {
                const ctx  = new (window.AudioContext || window.webkitAudioContext)();
                const beep = (t) => {
                    const osc  = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine';
                    osc.frequency.value = 880;
                    gain.gain.setValueAtTime(0.15, t);
                    osc.start(t);
                    osc.stop(t + 0.12);
                };
                beep(ctx.currentTime);
                beep(ctx.currentTime + 0.22);
            } catch (e) {
                console.warn('[KDS] AudioContext error', e);
            }
        };

        const triggerAlertEffect = () => {
            playAlertSound();
            flashScreen.value = true;
            setTimeout(() => { flashScreen.value = false; }, 800);
        };

        onMounted(() => {
            loadOrders();
            loadDrivers();
            initWebSocket();
            timer = setInterval(() => { now.value = new Date(); }, 30000);
        });

        onUnmounted(() => {
            if (ws) ws.close();
            if (timer) clearInterval(timer);
            if (pollingTimer) clearInterval(pollingTimer);
        });

        return {
            orders, drivers, loading, wsStatus, soundEnabled, flashScreen,
            activeTab, selectedDrivers, pendingTransition,
            pendingOrders, preparingOrders, readyOrders, deliveredOrders,
            mobileTabs, mobileVisibleOrders, mobileColor,
            isUrgent, renderTicketHeader, renderTicketItems,
            pendingTransitionLabel, transitionColor,
            promptTransition, executeTransition, toggleSound,
        };
    }
};