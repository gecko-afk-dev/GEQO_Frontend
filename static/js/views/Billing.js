import { ref, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { api } from '../api.js';

export default {
    name: 'Billing',
    template: `
        <div class="space-y-6 animate-fade-in max-w-4xl">
            <!-- Header -->
            <div>
                <!-- h2 removed -->
                <p class="text-sm text-slate-500 mt-0.5">Manage your prepaid wallet balance to ensure smooth order processing.</p>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="skeleton h-32 rounded-2xl w-full"></div>

            <!-- Content -->
            <div v-else class="space-y-6">
                
                <!-- Red Warning for Negative Balance -->
                <div v-if="balance < 0" class="p-4 bg-harissa/10 border border-harissa/30 rounded-xl flex items-start gap-3">
                    <svg class="w-6 h-6 text-harissa mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <div>
                        <h4 class="text-harissa font-bold text-sm uppercase tracking-wider mb-1">Negative Balance Alert</h4>
                        <p class="text-slate-300 text-sm">
                            Your wallet balance has fallen below zero. Please top up your account immediately to prevent any potential service interruptions.
                        </p>
                    </div>
                </div>

                <!-- Wallet Consumption Bar -->
                <div class="card-dark p-6 border border-white/[0.05]">
                    <div class="flex justify-between items-end mb-2">
                        <span class="text-sm font-bold text-slate-400 uppercase tracking-wider">Real-Time Wallet Level</span>
                        <span class="text-xs font-bold"
                              :class="balance > 100 ? 'text-emerald' : (balance > 0 ? 'text-saffron' : 'text-harissa')">
                            {{ balance > 100 ? 'Healthy' : (balance > 0 ? 'Low' : 'Depleted') }}
                        </span>
                    </div>
                    <div class="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-500"
                             :class="balance > 100 ? 'bg-emerald' : (balance > 0 ? 'bg-saffron' : 'bg-harissa')"
                             :style="{ width: Math.min(Math.max((balance / 500) * 100, 2), 100) + '%' }">
                        </div>
                    </div>
                    <div class="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
                        <span>0 MAD</span>
                        <span>500+ MAD</span>
                    </div>
                </div>

                <!-- Wallet Card -->
                <div class="card-dark p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/[0.05]">
                    <div>
                        <p class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Current Wallet Balance</p>
                        <div class="text-5xl font-black tracking-tight font-mono flex items-baseline gap-2"
                             :class="balance < 0 ? 'text-harissa' : 'text-slate-100'">
                            {{ balance.toFixed(2) }}
                            <span class="text-2xl text-slate-500 font-sans">MAD</span>
                        </div>
                    </div>
                    
                    <div class="text-center md:text-right shrink-0">
                        <p class="text-xs text-slate-500 mb-2 max-w-[200px] ml-auto">3.0 MAD is automatically deducted per successful order.</p>
                        <button @click="showInstructions = true" class="btn btn-saffron px-8 text-sm h-12 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                            Top Up Account
                        </button>
                    </div>
                </div>

                <!-- Transactions Table -->
                <div class="mt-8">
                    <h3 class="text-xl font-bold text-slate-100 mb-4">Transaction History</h3>
                    <div class="overflow-x-auto rounded-2xl border border-white/[0.05]">
                        <table class="table-dark w-full text-left border-collapse" style="background: var(--superadmin-bg)">
                            <thead>
                                <tr class="border-b border-white/[0.05]">
                                    <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                    <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                                    <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="transactions.length === 0">
                                    <td colspan="4" class="p-8 text-center text-slate-500 italic text-sm">No transactions yet.</td>
                                </tr>
                                <tr v-for="t in transactions" :key="t.id" class="border-b border-white/[0.05] hover:bg-white/[0.02]">
                                    <td class="p-4 text-sm text-slate-400">{{ formatDate(t.created_at) }}</td>
                                    <td class="p-4">
                                        <span class="px-2 py-1 text-xs rounded-lg uppercase tracking-wider font-bold"
                                              :class="t.type === 'credit' ? 'bg-emerald/10 text-emerald' : (t.type === 'debit' ? 'bg-harissa/10 text-harissa' : 'bg-saffron/10 text-saffron')">
                                            {{ t.type }}
                                        </span>
                                    </td>
                                    <td class="p-4 text-sm text-slate-300">{{ t.description || '—' }}</td>
                                    <td class="p-4 text-right font-mono text-sm" :class="t.amount > 0 ? 'text-emerald' : 'text-slate-100'">
                                        {{ t.amount > 0 ? '+' : '' }}{{ t.amount.toFixed(2) }} MAD
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- ════ TOP UP INSTRUCTIONS MODAL ════ -->
            <template v-if="showInstructions">
                <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div class="w-full max-w-md rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden bg-slate-900">
                        <div class="px-6 pt-6 pb-4 border-b border-white/[0.08] flex justify-between items-center bg-slate-800/50">
                            <h3 class="text-lg font-black text-slate-100">Top Up Instructions</h3>
                            <button @click="showInstructions = false" class="text-slate-500 hover:text-slate-300 transition-colors">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div class="px-6 py-6 space-y-4">
                            <p class="text-sm text-slate-300">
                                To add funds to your GEQO wallet, please make a bank transfer using the details below.
                            </p>
                            
                            <div class="bg-black/50 border border-white/[0.05] rounded-xl p-4 space-y-3 font-mono text-sm">
                                <div class="flex justify-between">
                                    <span class="text-slate-500">Bank:</span>
                                    <span class="text-slate-200 font-bold">CIH Bank</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-500">Beneficiary:</span>
                                    <span class="text-slate-200 font-bold">GEQO S.A.R.L</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-500">RIB:</span>
                                    <span class="text-saffron font-bold text-right tracking-widest">230 780 000000000 0</span>
                                </div>
                            </div>
                            
                            <div class="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex gap-3 mt-4">
                                <span class="text-xl">📱</span>
                                <p class="text-sm text-blue-200 leading-relaxed">
                                    After transferring, please send the transfer receipt (screenshot) to our 
                                    <a href="#" class="text-blue-400 font-bold hover:underline">WhatsApp Support</a>. 
                                    Your wallet will be credited within 2-4 hours.
                                </p>
                            </div>
                        </div>
                        <div class="px-6 pb-6 pt-2">
                            <button @click="showInstructions = false" class="btn btn-ghost w-full bg-slate-800 hover:bg-slate-700 text-white">Got it</button>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    `,
    props: ['user'],
    setup(props) {
        const balance = ref(0);
        const transactions = ref([]);
        const loading = ref(true);
        const showInstructions = ref(false);

        onMounted(async () => {
            try {
                // Fetch the current restaurant's dashboard which includes the wallet_balance
                const res = await api.get('/admin/restaurant/dashboard');
                balance.value = res.data.restaurant.wallet_balance || 0;
                
                // Fetch transactions
                const txRes = await api.get('/admin/billing/transactions');
                transactions.value = txRes.data;
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

        return { balance, transactions, loading, showInstructions, formatDate };
    }
};
