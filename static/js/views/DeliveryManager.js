import { ref, onMounted, onUnmounted, computed } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { api } from '../api.js';

export default {
    template: `
        <div class="flex flex-col font-sans select-none h-full">
            <h2 class="text-xl font-bold font-mono tracking-widest uppercase mb-6 text-neutral-800">Fleet Logistics</h2>

            <div v-if="loading" class="flex-1 flex items-center justify-center text-neutral-500 animate-pulse font-mono text-sm">
                SYNCING LOGISTICS LEDGER...
            </div>
            
            <div v-else class="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                
                <!-- Column 1: Out for Delivery -->
                <div class="flex flex-col bg-[#141414] border border-neutral-800 overflow-hidden relative">
                    <div class="p-4 border-b border-neutral-800 bg-[#1A1A1A]">
                        <h3 class="text-sm font-mono tracking-widest text-amber-500 font-black">OUT FOR DELIVERY ({{ dispatchedOrders.length }})</h3>
                    </div>
                    <div class="overflow-y-auto flex-1 p-4 space-y-4">
                        <div v-if="dispatchedOrders.length === 0" class="text-neutral-500 font-mono text-xs text-center py-8">NO ACTIVE DELIVERIES</div>
                        <div v-for="order in dispatchedOrders" :key="order.id" class="border border-neutral-700 bg-[#1A1A1A] p-4">
                            <div class="flex justify-between items-start mb-2">
                                <h4 class="text-lg font-black font-mono text-white">#{{ order.tracking_code || order.id }}</h4>
                                <span class="bg-blue-900/60 text-blue-300 border border-blue-700 px-2 py-1 text-[10px] font-black uppercase tracking-widest">
                                    DISPATCHED
                                </span>
                            </div>
                            <div class="space-y-1 mb-4">
                                <p class="text-sm text-neutral-300"><span class="text-neutral-500 font-mono">Customer:</span> {{ order.customer?.name || 'Unknown' }}</p>
                                <p class="text-sm text-neutral-300"><span class="text-neutral-500 font-mono">Phone:</span> {{ order.customer?.phone_number || order.customer_wa_id || 'Unknown' }}</p>
                                <p class="text-sm text-neutral-300"><span class="text-neutral-500 font-mono">Collect:</span> <span class="font-bold text-amber-400">{{ order.total_price }} MAD</span></p>
                                <p class="text-sm text-neutral-300 mt-2"><span class="text-neutral-500 font-mono">Driver:</span> <span class="font-bold text-emerald-400">🛵 {{ order.driver?.name || 'Unknown' }}</span></p>
                            </div>
                            <div class="flex gap-2">
                                <a :href="'https://wa.me/' + order.customer_wa_id" target="_blank" class="flex-1 text-center py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors">
                                    Message Customer
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Column 2: Completed Today -->
                <div class="flex flex-col bg-[#141414] border border-neutral-800 overflow-hidden relative">
                    <div class="p-4 border-b border-neutral-800 bg-[#1A1A1A]">
                        <h3 class="text-sm font-mono tracking-widest text-emerald-500 font-black">COMPLETED TODAY ({{ deliveredOrders.length }})</h3>
                    </div>
                    <div class="overflow-y-auto flex-1 p-4 space-y-4">
                        <div v-if="deliveredOrders.length === 0" class="text-neutral-500 font-mono text-xs text-center py-8">NO COMPLETED DELIVERIES</div>
                        <div v-for="order in deliveredOrders" :key="order.id" class="border border-neutral-800 bg-black p-4 opacity-75">
                            <div class="flex justify-between items-start mb-2">
                                <h4 class="text-lg font-black font-mono text-neutral-400">#{{ order.tracking_code || order.id }}</h4>
                                <span class="bg-emerald-900/40 text-emerald-500 border border-emerald-800 px-2 py-1 text-[10px] font-black uppercase tracking-widest">
                                    DELIVERED
                                </span>
                            </div>
                            <div class="space-y-1">
                                <p class="text-sm text-neutral-400"><span class="text-neutral-600 font-mono">Customer:</span> {{ order.customer?.name || 'Unknown' }}</p>
                                <p class="text-sm text-neutral-400"><span class="text-neutral-600 font-mono">Collect:</span> {{ order.total_price }} MAD</p>
                                <p class="text-sm text-neutral-400"><span class="text-neutral-600 font-mono">Driver:</span> 🛵 {{ order.driver?.name || 'Unknown' }}</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    `,
    props: ['user', 'lang'],
    setup(props) {
        const deliveries = ref([]);
        const loading = ref(true);
        let ws = null;
        let reconnectTimer = null;

        const dispatchedOrders = computed(() => {
            return deliveries.value.filter(o => o.status === 'dispatched');
        });

        const deliveredOrders = computed(() => {
            return deliveries.value.filter(o => o.status === 'delivered');
        });

        const loadDeliveries = async () => {
            if (!props.user || !props.user.restaurant_id) return;
            loading.value = true;
            try {
                const res = await api.get('/dashboard/deliveries/' + props.user.restaurant_id);
                deliveries.value = res.data;
            } catch (err) {
                console.error('Failed to load deliveries:', err);
            } finally {
                loading.value = false;
            }
        };

        const initWebSocket = () => {
            if (!props.user || !props.user.restaurant_id) return;
            const token = localStorage.getItem('token');
            if (!token) return;

            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${wsProtocol}//${window.location.host}/api/v1/dashboard/ws/${props.user.restaurant_id}`;
            
            ws = new WebSocket(wsUrl, ["bearer", token]);

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.event === 'ORDER_STATUS_UPDATED' && (data.new_status === 'dispatched' || data.new_status === 'delivered')) {
                    loadDeliveries();
                } else if (data.event === 'NEW_ORDER') {
                    // Delivery board doesn't care about NEW_ORDER unless we want to track it early.
                }
            };

            ws.onclose = () => {
                const delay = Math.min(10000, Math.max(1000, Math.random() * 5000));
                clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(initWebSocket, delay);
            };
        };

        onMounted(() => {
            loadDeliveries();
            initWebSocket();
        });

        onUnmounted(() => {
            clearTimeout(reconnectTimer);
            if (ws) ws.close();
        });

        return {
            loading,
            dispatchedOrders,
            deliveredOrders
        };
    }
}
