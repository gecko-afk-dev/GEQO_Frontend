import { ref, onMounted, onUnmounted, computed, watch } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { api } from '../api.js';

export default {
    template: `
        <div class="flex flex-col font-sans select-none">
            
            <!-- Filters -->
            <div class="flex gap-2 min-w-max mb-6">
                <button @click="activeFilter = 'all'" 
                        class="px-4 py-2 rounded text-[11px] font-mono tracking-widest uppercase transition-all"
                        :class="activeFilter === 'all' ? 'bg-white text-black' : 'bg-[#141414] text-neutral-400 border border-neutral-800 hover:bg-[#1A1A1A]'">
                    All ({{ orders.length }})
                </button>
                <button @click="activeFilter = 'received'" 
                        class="px-4 py-2 rounded text-[11px] font-mono tracking-widest uppercase transition-all"
                        :class="activeFilter === 'received' ? 'bg-white text-black' : 'bg-[#141414] text-neutral-400 border border-neutral-800 hover:bg-[#1A1A1A]'">
                    New ({{ filterCounts['received'] || 0 }})
                </button>
                <button @click="activeFilter = 'accepted'" 
                        class="px-4 py-2 rounded text-[11px] font-mono tracking-widest uppercase transition-all"
                        :class="activeFilter === 'accepted' ? 'bg-white text-black' : 'bg-[#141414] text-neutral-400 border border-neutral-800 hover:bg-[#1A1A1A]'">
                    Accepted ({{ filterCounts['accepted'] || 0 }})
                </button>
                <button @click="activeFilter = 'preparing'" 
                        class="px-4 py-2 rounded text-[11px] font-mono tracking-widest uppercase transition-all"
                        :class="activeFilter === 'preparing' ? 'bg-white text-black' : 'bg-[#141414] text-neutral-400 border border-neutral-800 hover:bg-[#1A1A1A]'">
                    Preparing ({{ filterCounts['preparing'] || 0 }})
                </button>
                <button @click="activeFilter = 'ready'" 
                        class="px-4 py-2 rounded text-[11px] font-mono tracking-widest uppercase transition-all"
                        :class="activeFilter === 'ready' ? 'bg-white text-black' : 'bg-[#141414] text-neutral-400 border border-neutral-800 hover:bg-[#1A1A1A]'">
                    Ready ({{ filterCounts['ready'] || 0 }})
                </button>
                <button @click="activeFilter = 'dispatched'" 
                        class="px-4 py-2 rounded text-[11px] font-mono tracking-widest uppercase transition-all"
                        :class="activeFilter === 'dispatched' ? 'bg-blue-600 text-white' : 'bg-[#141414] text-neutral-400 border border-neutral-800 hover:bg-[#1A1A1A]'">
                    🛵 Dispatched ({{ filterCounts['dispatched'] || 0 }})
                </button>
            </div>

            <div v-if="loading" class="flex-1 flex items-center justify-center text-neutral-500 animate-pulse font-mono text-sm">
                SYNCING LEDGER...
            </div>
            
            <div v-else-if="orders.length === 0" class="flex-1 border border-neutral-800 bg-[#141414] flex flex-col items-center justify-center p-10 text-center">
                <p class="text-neutral-500 font-bold font-mono tracking-widest uppercase text-lg">NO ACTIVE ORDERS</p>
                <p class="text-neutral-600 text-xs mt-2 font-mono">AWAITING INBOUND TRANSMISSIONS</p>
            </div>

            <div v-else class="flex-1 grid grid-cols-1 lg:grid-cols-16 gap-6 min-h-0">
                
                <!-- Left Panel: Order Ledger (10 cols) -->
                <div class="lg:col-span-10 flex flex-col bg-[#141414] border border-neutral-800 overflow-hidden relative">
                    <div class="overflow-y-auto flex-1 scrollbar-hide">
                        <table class="w-full text-left border-collapse">
                            <thead class="sticky top-0 bg-[#0A0A0A] border-b border-neutral-800 z-10">
                                <tr>
                                    <th class="py-3 px-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest w-24">Order ID</th>
                                    <th class="py-3 px-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Summary</th>
                                    <th class="py-3 px-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest w-28 text-right">Total</th>
                                    <th class="py-3 px-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest w-32">Status</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-neutral-800/50">
                                <tr v-for="order in sortedOrders" :key="order.id" 
                                    @click="selectAndMarkViewed(order)"
                                    class="group cursor-pointer transition-all duration-300"
                                    :class="[
                                        selectedOrderId === order.id ? 'bg-[#1A1A1A]' : 'hover:bg-white/[0.02]',
                                        order.status === 'received' && !viewedOrders.has(order.id)
                                            ? 'ring-1 ring-inset ring-amber-500/60 bg-amber-500/5'
                                            : ''
                                    ]">
                                    
                                    <td class="py-4 px-4 font-mono font-bold text-sm" :class="selectedOrderId === order.id ? 'text-amber-500' : 'text-neutral-300'">
                                        #{{ order.tracking_code || order.id }}
                                    </td>
                                    
                                    <td class="py-4 px-4">
                                        <div class="flex items-center gap-2 mb-1">
                                            <span class="px-1.5 py-0.5 border border-neutral-700 bg-neutral-800/50 text-[9px] font-bold tracking-wider uppercase text-neutral-400">
                                                {{ order.fulfillment_method }}
                                            </span>
                                            <span class="text-xs text-neutral-500 font-mono">{{ timeAgo(order.created_at) }}</span>
                                        </div>
                                        <div class="text-sm font-semibold text-neutral-200 line-clamp-1" dir="auto">
                                            {{ orderSummary(order) }}
                                        </div>
                                    </td>
                                    
                                    <td class="py-4 px-4 font-mono font-bold text-neutral-300 text-right">
                                        {{ order.total_price }} MAD
                                    </td>
                                    
                                    <td class="py-4 px-4">
                                        <span class="inline-block px-2 py-1 text-[10px] font-black uppercase tracking-widest" :class="statusPillClass(order.status)">
                                            {{ order.status }}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Right Panel: Active Order Detail Drawer (6 cols) -->
                <div class="lg:col-span-6 bg-[#141414] border border-neutral-800 flex flex-col overflow-hidden relative">
                    <div v-if="selectedOrder" class="flex flex-col h-full">
                        <div class="p-6 border-b border-neutral-800 bg-[#1A1A1A] shrink-0">
                            <div class="flex justify-between items-start mb-4">
                                <div>
                                    <p class="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">ACTIVE TICKET</p>
                                    <h2 class="text-3xl font-black font-mono text-amber-500 mt-1">#{{ selectedOrder.tracking_code || selectedOrder.id }}</h2>
                                </div>
                                <span class="px-3 py-1.5 text-xs font-black uppercase tracking-widest border" :class="statusPillClass(selectedOrder.status)">
                                    {{ selectedOrder.status }}
                                </span>
                            </div>
                            <div class="flex justify-between text-sm font-mono text-neutral-400">
                                <span>{{ selectedOrder.fulfillment_method.toUpperCase() }}</span>
                                <span>{{ timeAgo(selectedOrder.created_at) }}</span>
                            </div>
                        </div>

                        <div class="p-6 flex-1 overflow-y-auto space-y-6">
                            <!-- Items List -->
                            <div>
                                <h3 class="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4 border-b border-neutral-800 pb-2">MANIFEST</h3>
                                <ul class="space-y-4">
                                    <li v-for="item in selectedOrder.items" :key="item.id" class="flex justify-between text-sm">
                                        <div class="flex-1 pr-4">
                                            <span class="font-mono text-amber-500 font-bold mr-2">{{ item.quantity }}x</span>
                                            <span class="font-bold text-neutral-200" dir="auto">{{ getItemName(item) }}</span>
                                            
                                            <!-- Modifiers render if present -->
                                            <template v-if="item.modifiers && item.modifiers.length">
                                                <div v-for="mod in item.modifiers" :key="mod.id" class="text-amber-500 font-mono text-xs pl-4 border-l border-amber-500/20">
                                                + {{ mod.modifier_option ? (mod.modifier_option['name_' + lang] || mod.modifier_option.name_fr || mod.modifier_option.name_en) : (mod['name_' + lang] || mod.name_fr || mod.name_en) }}
                                                </div>
                                            </template>
                                            <!-- Exclusions render if present -->
                                            <div v-if="item.exclusions && item.exclusions.length" class="mt-1 pl-6">
                                                <div v-for="exc in item.exclusions" class="text-xs text-red-400/80 font-medium">
                                                    - SANS {{ exc.ingredient_name.toUpperCase() }}
                                                </div>
                                            </div>
                                        </div>
                                        <span class="font-mono text-neutral-400">{{ (item.unit_price * item.quantity).toFixed(2) }} MAD</span>
                                    </li>
                                </ul>
                            </div>

                            <!-- Customer Notes -->
                            <div v-if="selectedOrder.customer_notes" class="bg-amber-500/10 border border-amber-500/30 p-4">
                                <h3 class="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">CUSTOMER NOTES</h3>
                                <p class="text-sm text-neutral-200 italic">"{{ selectedOrder.customer_notes }}"</p>
                            </div>
                            
                            <!-- Location Link -->
                            <div v-if="selectedOrder.latitude && selectedOrder.longitude" class="flex gap-2 items-center">
                                <a :href="'https://maps.google.com/?q=' + selectedOrder.latitude + ',' + selectedOrder.longitude"
                                   target="_blank" rel="noopener"
                                   class="text-xs font-mono font-bold text-blue-400 hover:text-blue-300 underline underline-offset-2">
                                   [+] OPEN GEO-LOCATION
                                </a>
                            </div>
                        </div>

                        <!-- Actions Footer -->
                        <div class="p-6 border-t border-neutral-800 bg-[#0A0A0A] shrink-0">
                            <div class="flex justify-between items-center mb-4">
                                <span class="text-xs font-mono font-bold text-neutral-500 uppercase tracking-widest">TOTAL</span>
                                <span class="text-xl font-black font-mono text-white">{{ selectedOrder.total_price.toFixed(2) }} MAD</span>
                            </div>
                            
                            <!-- State Machine Actions -->
                            <div class="flex gap-3">
                                <template v-if="selectedOrder.status === 'received'">
                                    <button @click="updateStatus(selectedOrder.id, 'cancelled')" class="flex-1 py-3 border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-black uppercase tracking-widest transition-colors">Reject</button>
                                    <button @click="updateStatus(selectedOrder.id, 'accepted')" class="flex-1 py-3 border border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-black uppercase tracking-widest transition-colors">Accept</button>
                                </template>
                                <template v-else-if="selectedOrder.status === 'accepted'">
                                    <button @click="updateStatus(selectedOrder.id, 'preparing')" class="flex-1 py-3 border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-black uppercase tracking-widest transition-colors">Start Prep</button>
                                </template>
                                <template v-else-if="selectedOrder.status === 'preparing'">
                                    <button @click="updateStatus(selectedOrder.id, 'ready')" class="flex-1 py-3 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-black uppercase tracking-widest transition-colors">Mark Ready</button>
                                </template>
                                <template v-else-if="selectedOrder.status === 'ready' && selectedOrder.fulfillment_method === 'delivery'">
                                    <div class="flex-1 flex flex-col gap-2">
                                        <select v-model="selectedDriverId" class="w-full bg-[#1A1A1A] border border-neutral-700 text-neutral-200 text-xs px-3 py-2 font-mono h-10 outline-none focus:border-amber-500">
                                            <option value="">— Broadcast to Fleet —</option>
                                            <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }}</option>
                                        </select>
                                        <button @click="dispatchOrder(selectedOrder.id)" class="w-full py-3 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-black uppercase tracking-widest transition-colors">
                                            {{ selectedDriverId ? 'Assign Driver' : 'Broadcast' }}
                                        </button>
                                    </div>
                                </template>
                                <template v-else-if="selectedOrder.status === 'ready' && selectedOrder.fulfillment_method === 'pickup'">
                                    <button @click="updateStatus(selectedOrder.id, 'delivered')" class="flex-1 py-3 border border-neutral-500/30 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-xs font-black uppercase tracking-widest transition-colors">Handed to Customer</button>
                                </template>
                                <template v-else>
                                    <p class="w-full text-center text-xs font-mono text-neutral-500 py-3 border border-neutral-800 bg-[#1A1A1A]">NO ACTIONS AVAILABLE</p>
                                </template>
                            </div>
                        </div>
                    </div>
                    <div v-else class="flex-1 flex items-center justify-center text-neutral-600 font-mono text-xs text-center p-10">
                        SELECT AN ORDER FROM THE LEDGER<br>TO VIEW MANIFEST
                    </div>
                </div>
            </div>
        </div>
    `,
    props: ['user', 'lang'],
    setup(props) {
        const orders = ref([]);
        const drivers = ref([]);
        const loading = ref(true);
        const activeFilter = ref('all');
        const selectedOrderId = ref(null);
        const selectedDriverId = ref('');
        const viewedOrders = ref(new Set());
        let ws = null;
        let wsRetryCount = 0;

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

        const scheduleReconnect = () => {
            wsRetryCount++;
            const delay = Math.min(30000, Math.pow(2, wsRetryCount) * 1000 + Math.random() * 1000);
            console.warn(`[OrdersManager] WebSocket disconnected. Reconnecting in ${Math.round(delay / 1000)}s...`);
            setTimeout(initWebSocket, delay);
        };

        const loadOrders = async () => {
            if (!props.user || !props.user.restaurant_id) return;
            loading.value = true;
            try {
                const res = await api.get('/dashboard/orders/' + props.user.restaurant_id);
                orders.value = res.data;
            } catch (err) {
                console.error(err);
            } finally {
                loading.value = false;
            }
        };
        
        const loadDrivers = async () => {
            if (!props.user || !props.user.restaurant_id) return;
            try {
                const res = await api.get('/admin/drivers');
                drivers.value = res.data || [];
            } catch (err) {
                console.warn('[OrdersManager] drivers load skipped', err);
            }
        };

        const updateStatus = async (id, newStatus) => {
            try {
                await api.post('/dashboard/orders/' + id + '/status', { new_status: newStatus });
                const order = orders.value.find(o => o.id === id);
                if (order) order.status = newStatus;
                if (newStatus === 'cancelled' || newStatus === 'delivered') {
                    orders.value = orders.value.filter(o => o.id !== id);
                    if (selectedOrderId.value === id) selectedOrderId.value = null;
                }
            } catch (err) {
                console.error(err);
                alert("Failed to update status");
            }
        };
        
        const dispatchOrder = async (id) => {
            try {
                const payload = { new_status: 'dispatched' };
                if (selectedDriverId.value) payload.driver_id = selectedDriverId.value;
                await api.post('/dashboard/orders/' + id + '/status', payload);
                orders.value = orders.value.filter(o => o.id !== id);
                if (selectedOrderId.value === id) selectedOrderId.value = null;
            } catch (err) {
                console.error(err);
                alert("Failed to dispatch order");
            }
        };

        const initWebSocket = () => {
            if (!props.user || !props.user.restaurant_id) return;
            const token = localStorage.getItem('token');
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const protocol = isLocal ? 'ws:' : 'wss:';
            const wsHost = isLocal ? 'localhost:8000' : 'api.mygeqo.com';
            const wsUrl = `${protocol}//${wsHost}/api/v1/dashboard/ws/${props.user.restaurant_id}`;
            const isRealToken = token && token !== 'cookie';
            ws = isRealToken ? new WebSocket(wsUrl, [`bearer.${token}`]) : new WebSocket(wsUrl);

            ws.onopen = () => { wsRetryCount = 0; };
            ws.onclose = (event) => {
                if (event.code === 4001 || event.code === 4003) return;
                scheduleReconnect();
            };
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.event === 'NEW_ORDER' || data.event === 'ORDER_STATUS_UPDATED') {
                    loadOrders();
                }
            };
        };

        const filterCounts = computed(() => {
            const counts = {};
            orders.value.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
            return counts;
        });

        const sortedOrders = computed(() => {
            let filtered = orders.value;
            if (activeFilter.value !== 'all') {
                filtered = filtered.filter(o => o.status === activeFilter.value);
            }
            const statusWeights = { 'received': 1, 'accepted': 2, 'preparing': 3, 'ready': 4, 'dispatched': 5 };
            return [...filtered].sort((a, b) => {
                const wa = statusWeights[a.status] || 99;
                const wb = statusWeights[b.status] || 99;
                if (wa !== wb) return wa - wb;
                return b.id - a.id;
            });
        });
        
        const selectedOrder = computed(() => {
            return orders.value.find(o => o.id === selectedOrderId.value) || null;
        });
        
        const selectOrder = (order) => {
            selectedOrderId.value = order.id;
            selectedDriverId.value = '';
        };

        const selectAndMarkViewed = (order) => {
            selectedOrderId.value = order.id;
            selectedDriverId.value = '';
            // Remove saffron highlight once clicked
            const updated = new Set(viewedOrders.value);
            updated.add(order.id);
            viewedOrders.value = updated;
        };

        const orderSummary = (order) => {
            if (!order.items || order.items.length === 0) return 'No items';
            return order.items.map(i => `${i.quantity}x ${getItemName(i)}`).join(', ');
        };

        const timeAgo = (dateStr) => {
            if (!dateStr) return '';
            const utcStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
            const diffInSeconds = Math.floor((new Date() - new Date(utcStr)) / 1000);
            if (diffInSeconds < 60) return 'NOW';
            const diffInMinutes = Math.floor(diffInSeconds / 60);
            if (diffInMinutes < 60) return diffInMinutes + 'M';
            const diffInHours = Math.floor(diffInMinutes / 60);
            if (diffInHours < 24) return diffInHours + 'H ' + (diffInMinutes % 60) + 'M';
            return Math.floor(diffInHours / 24) + 'D';
        };

        const statusPillClass = (status) => {
            const colors = {
                'received':   'status-pending',
                'accepted':   'status-pending',
                'preparing':  'status-preparing',
                'ready':      'status-ready',
                'dispatched': 'bg-blue-900/60 text-blue-300 border border-blue-700',
            };
            return colors[status] || 'status-delivered';
        };

        onMounted(() => {
            loadOrders();
            loadDrivers();
            initWebSocket();
        });

        onUnmounted(() => { if (ws) ws.close(); });

        return { 
            orders, drivers, loading, activeFilter, filterCounts, 
            selectedOrderId, selectedOrder, selectedDriverId, selectOrder,
            selectAndMarkViewed, viewedOrders,
            updateStatus, dispatchOrder,
            sortedOrders, statusPillClass, timeAgo, orderSummary, getItemName
        };
    }
}