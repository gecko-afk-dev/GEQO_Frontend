import { ref, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { api } from '../api.js';

export default {
    name: 'Billing',
    template: `
        <div class="space-y-6 animate-fade-in max-w-5xl font-sans select-none">

            <!-- Loading -->
            <div v-if="loading" class="flex items-center justify-center py-20">
                <div class="text-[10px] font-mono tracking-widest text-neutral-500 animate-pulse uppercase">Syncing Financial Ledger...</div>
            </div>

            <!-- Content -->
            <div v-else class="space-y-6">
                
                <!-- ADMIN VIEW -->
                <template v-if="user.role === 'admin'">
                    <div class="bg-[#141414] border border-neutral-800">
                        <div class="p-4 border-b border-neutral-800 bg-[#0A0A0A]">
                            <h3 class="text-xs font-black font-mono tracking-widest uppercase text-neutral-400">Master Wallet Ledger</h3>
                        </div>
                        <div class="overflow-x-auto scrollbar-hide p-4">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="border-b border-neutral-800">
                                        <th class="py-3 px-4 text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">Restaurant</th>
                                        <th class="py-3 px-4 text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">WhatsApp</th>
                                        <th class="py-3 px-4 text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest text-right">Wallet Balance</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-neutral-800/50">
                                    <tr v-for="r in adminRestaurants" :key="r.id" class="hover:bg-white/[0.02] transition-colors">
                                        <td class="py-4 px-4 text-sm font-bold text-neutral-200">{{ r.name }}</td>
                                        <td class="py-4 px-4 text-sm font-mono text-neutral-400">{{ r.wa_phone_number }}</td>
                                        <td class="py-4 px-4 text-right font-mono font-black text-sm" :class="r.wallet_balance < 0 ? 'text-red-500' : 'text-emerald-400'">
                                            {{ (r.wallet_balance || 0).toFixed(2) }} MAD
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </template>

                <!-- OWNER VIEW -->
                <template v-else>
                <!-- Red Warning for Negative Balance -->
                <div v-if="balance < 0" class="p-4 bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                    <span class="text-red-500 mt-0.5 text-lg font-black font-mono">!</span>
                    <div>
                        <h4 class="text-red-500 font-black font-mono text-[10px] uppercase tracking-widest mb-1">Negative Balance Alert</h4>
                        <p class="text-neutral-400 text-xs font-mono">
                            Your wallet balance has fallen below zero. Please top up your account immediately to prevent any potential service interruptions once you hit the -75.0 MAD threshold.
                        </p>
                    </div>
                </div>

                <!-- Wallet & Top Up Card -->
                <div class="grid lg:grid-cols-2 gap-6">
                    <!-- Balance Section -->
                    <div class="bg-[#141414] border border-neutral-800 flex flex-col justify-center p-8">
                        <p class="text-[10px] font-black font-mono text-neutral-500 uppercase tracking-widest mb-2">Current Wallet Balance</p>
                        <div class="text-5xl font-black font-mono mb-6"
                             :class="balance < 0 ? 'text-red-500' : 'text-emerald-400'">
                            {{ balance.toFixed(2) }} <span class="text-2xl text-neutral-600">MAD</span>
                        </div>
                        
                        <!-- Consumption Bar -->
                        <div class="mb-2 flex justify-between items-end">
                            <span class="text-[10px] font-black font-mono text-neutral-500 uppercase tracking-widest">Grace Period Threshold (-75 MAD)</span>
                        </div>
                        <div class="w-full h-2 bg-neutral-900 overflow-hidden relative">
                            <!-- Threshold line at exactly 0 MAD if scale goes from 500 to -75 -->
                            <div class="absolute top-0 bottom-0 left-[13%] w-px bg-red-500/50 z-10"></div>
                            
                            <!-- The bar -->
                            <div class="h-full transition-all duration-500 relative z-0"
                                 :class="balance > 100 ? 'bg-emerald-400' : (balance > 0 ? 'bg-amber-500' : 'bg-red-500')"
                                 :style="{ width: Math.min(Math.max(((balance + 75) / 575) * 100, 0), 100) + '%' }">
                            </div>
                        </div>
                        <div class="flex justify-between text-[10px] text-neutral-600 mt-2 font-mono font-bold">
                            <span>-75.0 MAD (CUT-OFF)</span>
                            <span>500+ MAD</span>
                        </div>
                        
                        <p class="text-[10px] text-neutral-500 mt-8 font-mono border-t border-neutral-800 pt-4">3.0 MAD is automatically deducted per successful order.</p>
                    </div>
                    
                    <!-- Top Up Instructions -->
                    <div class="bg-[#141414] border border-neutral-800 p-8 flex flex-col justify-between">
                        <div>
                            <h4 class="text-xs font-black font-mono text-amber-500 tracking-widest uppercase mb-4">Top Up Instructions</h4>
                            <p class="text-xs text-neutral-400 mb-6 font-mono leading-relaxed">
                                Make a bank transfer using the details below. Send the transfer receipt (screenshot) to our WhatsApp Support. Your wallet will be credited within 2-4 hours.
                            </p>
                        </div>
                        <div class="bg-[#0A0A0A] border border-neutral-800 p-6 space-y-4 font-mono text-xs">
                            <div class="flex justify-between border-b border-neutral-800 pb-2">
                                <span class="text-neutral-500">Bank:</span>
                                <span class="text-neutral-200 font-bold">CIH Bank</span>
                            </div>
                            <div class="flex justify-between border-b border-neutral-800 pb-2">
                                <span class="text-neutral-500">Name:</span>
                                <span class="text-neutral-200 font-bold">GEQO S.A.R.L</span>
                            </div>
                            <div class="flex justify-between pt-1">
                                <span class="text-neutral-500">RIB:</span>
                                <span class="text-amber-500 font-black tracking-widest text-sm">230 780 000000000 0</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Transactions Table -->
                <div class="bg-[#141414] border border-neutral-800 mt-6">
                    <div class="p-4 border-b border-neutral-800 bg-[#0A0A0A]">
                        <h3 class="text-xs font-black font-mono tracking-widest uppercase text-neutral-400">Transaction History</h3>
                    </div>
                    <div class="overflow-x-auto scrollbar-hide p-4">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="border-b border-neutral-800">
                                    <th class="py-3 px-4 text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">Date</th>
                                    <th class="py-3 px-4 text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">Type</th>
                                    <th class="py-3 px-4 text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">Description</th>
                                    <th class="py-3 px-4 text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-neutral-800/50">
                                <tr v-if="transactions.length === 0">
                                    <td colspan="4" class="py-8 text-center text-neutral-600 font-mono text-[10px] tracking-widest uppercase">No transactions found.</td>
                                </tr>
                                <tr v-for="t in transactions" :key="t.id" class="hover:bg-white/[0.02] transition-colors">
                                    <td class="py-4 px-4 text-xs font-mono text-neutral-400">{{ formatDate(t.created_at) }}</td>
                                    <td class="py-4 px-4">
                                        <span class="px-2 py-1 text-[9px] font-black font-mono tracking-widest uppercase border"
                                              :class="t.type === 'credit' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : (t.type === 'debit' ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-amber-500/10 text-amber-500 border-amber-500/30')">
                                            {{ t.type }}
                                        </span>
                                    </td>
                                    <td class="py-4 px-4 text-xs text-neutral-300 font-mono">{{ t.description || '—' }}</td>
                                    <td class="py-4 px-4 text-right font-mono font-black text-xs" :class="t.amount > 0 ? 'text-emerald-400' : 'text-neutral-200'">
                                        {{ t.amount > 0 ? '+' : '' }}{{ t.amount.toFixed(2) }} MAD
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                </template>
            </div>
        </div>
    `,`,
    props: ['user'],
    setup(props) {
        const balance = ref(0);
        const transactions = ref([]);
        const loading = ref(true);
        

        const adminRestaurants = ref([]);

        onMounted(async () => {
            try {
                if (props.user.role === 'admin') {
                    const res = await api.get('/admin/restaurants');
                    adminRestaurants.value = res.data;
                } else {
                    const res = await api.get('/admin/restaurant/dashboard');
                    balance.value = res.data.restaurant.wallet_balance || 0;
                    
                    const txRes = await api.get('/admin/billing/transactions');
                    transactions.value = txRes.data;
                }
            } catch (err) {
                console.error('[Billing] error loading balance or transactions', err);
            } finally {
                loading.value = false;
            }
        });

        const formatDate = (iso) => {
            if (!iso) return '—';
            const d = new Date(iso);
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        };

        return { balance, transactions, loading, adminRestaurants, formatDate };
    }
};
