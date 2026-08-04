import { ref, onMounted, onUnmounted, computed } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { api } from '../api.js';

export default {
    template: `
        <div>
            <div class="flex justify-between items-center mb-6">
                <!-- h2 brutally removed -->
                <button @click="loadOrders" class="text-sm font-medium text-emerald-600 hover:text-blue-800">
                    Refresh
                </button>
            </div>

            <div v-if="loading" class="text-center py-10 text-slate-500 animate-pulse">Loading orders...</div>

            <div v-else-if="orders.length === 0" class="bg-white rounded-xl shadow-sm border border-slate-200 p-10 text-center">
                <svg class="mx-auto h-12 w-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                <p class="text-slate-500 font-medium text-lg">No active orders right now.</p>
                <p class="text-slate-400 text-sm mt-1">New orders will appear here automatically.</p>
            </div>
            <div v-else class="mb-6 overflow-x-auto pb-2 scrollbar-hide">
                <div class="flex gap-2 min-w-max">
                    <button @click="activeFilter = 'all'" 
                            class="px-4 py-2 rounded-full text-xs font-bold transition-all"
                            :class="activeFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
                        All Active ({{ orders.length }})
                    </button>
                    <button @click="activeFilter = 'received'" 
                            class="px-4 py-2 rounded-full text-xs font-bold transition-all"
                            :class="activeFilter === 'received' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
                        New ({{ filterCounts['received'] || 0 }})
                    </button>
                    <button @click="activeFilter = 'accepted'" 
                            class="px-4 py-2 rounded-full text-xs font-bold transition-all"
                            :class="activeFilter === 'accepted' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
                        Accepted ({{ filterCounts['accepted'] || 0 }})
                    </button>
                    <button @click="activeFilter = 'preparing'" 
                            class="px-4 py-2 rounded-full text-xs font-bold transition-all"
                            :class="activeFilter === 'preparing' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
                        Preparing ({{ filterCounts['preparing'] || 0 }})
                    </button>
                    <button @click="activeFilter = 'ready'" 
                            class="px-4 py-2 rounded-full text-xs font-bold transition-all"
                            :class="activeFilter === 'ready' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'">
                        Ready ({{ filterCounts['ready'] || 0 }})
                    </button>
                </div>
            </div>

            <div v-if="!loading && orders.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div v-for="order in sortedOrders" :key="order.id" class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col card-hover">
                    <div class="px-5 py-4 border-b border-slate-100 flex justify-between items-center" :class="statusBgColor(order.status)">
                        <div>
                            <span class="font-bold text-slate-800">#{{ order.tracking_code || order.id }}</span>
                            <span class="text-xs font-medium ml-2 px-2 py-0.5 rounded-full bg-white text-slate-700 shadow-sm uppercase tracking-wide">{{ order.fulfillment_method }}</span>
                            <span class="text-xs text-slate-500 block mt-1">{{ timeAgo(order.created_at) }}</span>
                        </div>
                        <span class="text-sm font-bold text-slate-800">{{ order.total_price }} MAD</span>
                    </div>
                    <div class="p-5 flex-1">
                        <ul class="space-y-3 mb-4">
                            <li v-for="item in order.items" :key="item.id" class="text-sm flex justify-between">
                                <span class="text-slate-700">
                                    <span class="font-semibold">{{ item.quantity }}x</span> 
                                    {{ item.name_fr || item.name_en || item.name_ar || 'Item #' + item.menu_item_id }}
                                </span>
                                <span class="text-slate-500">{{ item.unit_price * item.quantity }} MAD</span>
                            </li>
                        </ul>
                        <div class="mt-4 pt-4 border-t border-slate-100">
                            <p class="text-xs text-slate-500 mb-2">Current Status: <strong class="uppercase text-slate-700">{{ order.status }}</strong></p>
                            
                            <!-- Actions based on status -->
                            <div class="flex space-x-2 mt-3">
                                <template v-if="order.status === 'received'">
                                    <button @click="updateStatus(order.id, 'accepted')" class="flex-1 btn-primary text-xs py-2 bg-emerald-600 hover:bg-blue-700">Accept</button>
                                    <button @click="updateStatus(order.id, 'cancelled')" class="flex-1 btn-primary text-xs py-2 bg-red-600 hover:bg-red-700">Reject</button>
                                </template>
                                <template v-else-if="order.status === 'accepted'">
                                    <button @click="updateStatus(order.id, 'preparing')" class="flex-1 btn-primary text-xs py-2 bg-amber-500 hover:bg-amber-600">Start Preparing</button>
                                </template>
                                <template v-else-if="order.status === 'preparing'">
                                    <button v-if="order.fulfillment_method === 'pickup'" @click="updateStatus(order.id, 'ready')" class="flex-1 btn-primary text-xs py-2 bg-emerald-500 hover:bg-emerald-600">Mark Ready</button>
                                    <button v-else @click="updateStatus(order.id, 'ready')" class="flex-1 btn-primary text-xs py-2 bg-emerald-500 hover:bg-emerald-600">Ready for Driver</button>
                                </template>
                                <template v-else-if="order.status === 'ready'">
                                    <p class="text-xs text-slate-400 italic">Waiting for pickup/dispatch</p>
                                </template>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    props: ['user'],
    setup(props) {
        const orders = ref([]);
        const loading = ref(true);
        const wsConnected = ref(false);
        const activeFilter = ref('all');
        let ws = null;
        let wsRetryCount = 0;
        const WS_MAX_RETRIES = 5;

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

        const updateStatus = async (id, newStatus) => {
            try {
                await api.post('/dashboard/orders/' + id + '/status', { new_status: newStatus });
                // Optimistically update
                const order = orders.value.find(o => o.id === id);
                if (order) order.status = newStatus;
                // If it goes to terminal state we might remove it or keep it until reload
                if (newStatus === 'cancelled' || newStatus === 'delivered') {
                    orders.value = orders.value.filter(o => o.id !== id);
                }
            } catch (err) {
                console.error(err);
                alert("Failed to update status");
            }
        };

        const initWebSocket = () => {
            if (!props.user || !props.user.restaurant_id) return;
            
            const token = localStorage.getItem('token');
            // If there's no usable token yet (e.g. pre-login render), abort.
            // The cookie path will handle auth in production; the sentinel
            // value 'cookie' signals we should let the server try cookie auth.
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const protocol = isLocal ? 'ws:' : 'wss:';
            const wsHost = isLocal ? 'localhost:8000' : 'api.mygeqo.com';
            const wsUrl = `${protocol}//${wsHost}/api/v1/dashboard/ws/${props.user.restaurant_id}`;

            // Use subprotocol when we have a real JWT; otherwise open without
            // one and let the server use the httpOnly cookie (production path).
            const isRealToken = token && token !== 'cookie';
            ws = isRealToken
                ? new WebSocket(wsUrl, [`bearer.${token}`])
                : new WebSocket(wsUrl);

            ws.onopen = () => {
                wsConnected.value = true;
                wsRetryCount = 0;  // reset on successful connection
            };

            ws.onclose = (event) => {
                wsConnected.value = false;
                // Auth failures — retrying would just loop forever.
                // 4001 = missing/invalid token, 4003 = tenant mismatch.
                if (event.code === 4001 || event.code === 4003) {
                    console.error('[OrdersManager] WebSocket auth rejected (code', event.code, '). Not retrying.');
                    return;
                }
                // Generic disconnect — retry with backoff, but cap attempts.
                if (wsRetryCount >= WS_MAX_RETRIES) {
                    console.warn('[OrdersManager] WebSocket: max retries reached. Giving up.');
                    return;
                }
                wsRetryCount++;
                setTimeout(initWebSocket, 3000);
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.event === 'NEW_ORDER' || data.event === 'ORDER_STATUS_UPDATED') {
                    loadOrders(); // Re-fetch the orders to get fresh data
                }
            };
        };

        const filterCounts = computed(() => {
            const counts = {};
            orders.value.forEach(o => {
                counts[o.status] = (counts[o.status] || 0) + 1;
            });
            return counts;
        });

        const sortedOrders = computed(() => {
            // Filter by activeFilter
            let filtered = orders.value;
            if (activeFilter.value !== 'all') {
                filtered = filtered.filter(o => o.status === activeFilter.value);
            }
            
            // Sort by status priority then ID
            const statusWeights = { 'received': 1, 'accepted': 2, 'preparing': 3, 'ready': 4 };
            return [...filtered].sort((a, b) => {
                const wa = statusWeights[a.status] || 99;
                const wb = statusWeights[b.status] || 99;
                if (wa !== wb) return wa - wb;
                return b.id - a.id;
            });
        });

        const timeAgo = (dateStr) => {
            if (!dateStr) return '';
            // Ensure UTC parsing by appending Z if missing
            const utcStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
            const date = new Date(utcStr);
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            
            if (diffInSeconds < 60) return 'Just now';
            const diffInMinutes = Math.floor(diffInSeconds / 60);
            if (diffInMinutes < 60) return diffInMinutes + 'm ago';
            const diffInHours = Math.floor(diffInMinutes / 60);
            if (diffInHours < 24) return diffInHours + 'h ' + (diffInMinutes % 60) + 'm ago';
            const diffInDays = Math.floor(diffInHours / 24);
            return diffInDays + 'd ago';
        };

        const statusBgColor = (status) => {
            const colors = {
                'received': 'bg-emerald-50 border-b-blue-100',
                'accepted': 'bg-amber-50 border-b-amber-100',
                'preparing': 'bg-purple-50 border-b-purple-100',
                'ready': 'bg-emerald-50 border-b-emerald-100',
            };
            return colors[status] || 'bg-slate-50 border-b-slate-100';
        };

        onMounted(() => {
            loadOrders();
            initWebSocket();
        });

        onUnmounted(() => {
            if (ws) ws.close();
        });

        return { 
            orders, loading, wsConnected, activeFilter, filterCounts, 
            loadOrders, updateStatus, sortedOrders, statusBgColor, timeAgo 
        };
    }
}