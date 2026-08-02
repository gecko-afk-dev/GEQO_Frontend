import { ref, computed } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { api } from '../api.js';
import MenuManager from './MenuManager.js';
import DriversManager from './DriversManager.js';
import Settings from './Settings.js';
import AuditLog from './AuditLog.js';

export default {
    name: 'RestaurantProfile',
    components: {
        MenuManager,
        DriversManager,
        Settings,
        AuditLog
    },
    props: ['user', 'restaurant'],
    emits: ['back', 'suspend', 'activate', 'refreshList'],
    template: `
        <div class="space-y-6 animate-fade-in">

            <!-- ════ BACK BUTTON ════ -->
            <button @click="$emit('back')" class="btn btn-ghost text-sm text-slate-400 hover:text-white px-0 h-auto font-bold flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                Back to All Restaurants
            </button>

            <!-- ════ TOP RECAP SECTION ════ -->
            <div class="card-dark p-6 border border-white/[0.05] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent pointer-events-none"></div>

                <div class="flex-1 relative z-10">
                    <div class="flex items-center gap-3 mb-2">
                        <h2 class="text-3xl font-black text-white">{{ restaurant.name }}</h2>
                        <span class="badge" :class="restaurant.status === 'active' ? 'badge-emerald' : 'badge-harissa'">
                            {{ restaurant.status === 'active' ? 'Active' : 'Suspended' }}
                        </span>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                        <div>
                            <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">WhatsApp</p>
                            <p class="text-sm font-mono text-slate-300">{{ restaurant.wa_phone_number }}</p>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</p>
                            <p class="text-sm text-slate-300">{{ restaurant.contact_email }}</p>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">City</p>
                            <p class="text-sm text-slate-300">{{ restaurant.city || '---' }}</p>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Wallet Balance</p>
                            <p class="text-sm font-mono font-bold" :class="restaurant.wallet_balance < 0 ? 'text-harissa' : 'text-emerald'">
                                {{ (restaurant.wallet_balance || 0).toFixed(2) }} MAD
                            </p>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col gap-3 shrink-0 relative z-10 w-full md:w-auto">
                    <button @click="openWalletModal" class="btn btn-saffron font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        Adjust Wallet Balance
                    </button>
                    <button v-if="restaurant.status === 'active'" @click="$emit('suspend', restaurant)" class="btn btn-danger font-bold">
                        Suspend Restaurant
                    </button>
                    <button v-else @click="$emit('activate', restaurant.id)" class="btn bg-emerald/10 text-emerald hover:bg-emerald/20 border border-emerald/30 font-bold">
                        Activate Restaurant
                    </button>
                </div>
            </div>

            <!-- ════ BOTTOM TABS ════ -->
            <div class="border-b border-superadmin-border mt-8 flex overflow-x-auto scrollbar-hide">
                <button @click="activeTab = 'menu'"
                        class="px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap"
                        :class="activeTab === 'menu' ? 'border-saffron text-saffron' : 'border-transparent text-slate-500 hover:text-slate-300'">
                    Menu Management
                </button>
                <button @click="activeTab = 'agents'"
                        class="px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap"
                        :class="activeTab === 'agents' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-500 hover:text-slate-300'">
                    Delivery Agents
                </button>
                <button @click="activeTab = 'settings'"
                        class="px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap"
                        :class="activeTab === 'settings' ? 'border-berry text-berry' : 'border-transparent text-slate-500 hover:text-slate-300'">
                    Geo-Fencing
                </button>
                <button @click="activeTab = 'audit'"
                        class="px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap"
                        :class="activeTab === 'audit' ? 'border-emerald text-emerald' : 'border-transparent text-slate-500 hover:text-slate-300'">
                    Audit Logs
                </button>
            </div>

            <!-- ════ TAB CONTENT ════ -->
            <div class="pt-6 min-h-[500px]">
                <keep-alive>
                    <component :is="activeTabComponent" :user="mockedUser"></component>
                </keep-alive>
            </div>

            <!-- ════ ADJUST WALLET MODAL (lives HERE, not in parent) ════ -->
            <div v-if="showWalletModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div class="w-full max-w-sm rounded-2xl border border-white/[0.08] shadow-2xl"
                     style="background: var(--superadmin-bg, #0f172a)">
                    <div class="px-6 pt-6 pb-4 border-b border-white/[0.06]">
                        <h3 class="text-lg font-black text-slate-100">Adjust Wallet</h3>
                        <p class="text-xs text-slate-500">{{ restaurant.name }}</p>
                    </div>
                    <div class="px-6 py-5 space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Amount (MAD)</label>
                            <input v-model.number="adjustAmount" type="number" step="0.01" class="input-dark w-full text-lg font-mono" placeholder="100.00">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Type</label>
                            <select v-model="adjustType" class="input-dark w-full">
                                <option value="credit">Credit (Top-up)</option>
                                <option value="debit">Debit (Deduct)</option>
                                <option value="correction">Correction</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Description</label>
                            <input v-model="adjustDescription" type="text" class="input-dark w-full" placeholder="e.g. Manual top-up via bank transfer">
                        </div>
                        <div v-if="adjustError" class="mt-3 p-3 rounded-xl bg-harissa/10 border border-harissa/30 text-harissa text-sm">
                            {{ adjustError }}
                        </div>
                    </div>
                    <div class="px-6 pb-6 flex gap-3">
                        <button @click="showWalletModal = false" class="btn btn-ghost flex-1">Cancel</button>
                        <button @click="submitAdjust" :disabled="adjustLoading" class="btn btn-saffron flex-1 font-bold">
                            <span v-if="adjustLoading" class="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full mr-2 inline-block align-middle"></span>
                            {{ adjustLoading ? 'Processing...' : 'Confirm' }}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    `,
    setup(props, { emit }) {
        const activeTab = ref('menu');

        // Wallet Modal State — fully self-contained
        const showWalletModal = ref(false);
        const adjustAmount = ref(0);
        const adjustType = ref('credit');
        const adjustDescription = ref('');
        const adjustLoading = ref(false);
        const adjustError = ref('');

        const openWalletModal = () => {
            adjustAmount.value = 0;
            adjustType.value = 'credit';
            adjustDescription.value = '';
            adjustError.value = '';
            showWalletModal.value = true;
        };

        const submitAdjust = async () => {
            if (adjustAmount.value === 0) {
                adjustError.value = 'Amount cannot be 0';
                return;
            }
            if (!adjustDescription.value.trim()) {
                adjustError.value = 'Description is required';
                return;
            }
            adjustLoading.value = true;
            adjustError.value = '';
            try {
                let amt = adjustAmount.value;
                if (adjustType.value === 'debit') {
                    amt = -Math.abs(amt);
                } else if (adjustType.value === 'credit') {
                    amt = Math.abs(amt);
                }
                const res = await api.post('/admin/billing/adjust', {
                    restaurant_id: props.restaurant.id,
                    amount: amt,
                    type: adjustType.value,
                    description: adjustDescription.value
                });
                // Update the restaurant's wallet balance in-place
                props.restaurant.wallet_balance = res.data.wallet_balance;
                showWalletModal.value = false;
                emit('refreshList');
            } catch (err) {
                adjustError.value = err.response?.data?.detail || 'Failed to adjust wallet.';
            } finally {
                adjustLoading.value = false;
            }
        };

        // Compute which component to load
        const activeTabComponent = computed(() => {
            switch(activeTab.value) {
                case 'menu': return 'MenuManager';
                case 'agents': return 'DriversManager';
                case 'settings': return 'Settings';
                case 'audit': return 'AuditLog';
                default: return 'MenuManager';
            }
        });

        // Inject the specific restaurant_id into the user prop so children components load tenant data
        const mockedUser = computed(() => {
            return {
                ...props.user,
                restaurant_id: props.restaurant.id,
                role: 'restaurant_owner'
            };
        });

        return {
            activeTab, activeTabComponent, mockedUser,
            showWalletModal, adjustAmount, adjustType, adjustDescription,
            adjustLoading, adjustError, openWalletModal, submitAdjust
        };
    }
};
