/**
 * RestaurantsAdmin.js — Direction B Fleet Management Table
 *
 * Tabs:
 *  1. Restaurant Fleet  — CRUD for provisioned restaurants
 *  2. Beta Leads        — pending beta signups awaiting 1-click provisioning
 */
import { ref, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { api } from '../api.js';

export default {
    name: 'RestaurantsAdmin',
    template: `
        <div class="space-y-6 animate-fade-in">

            <!-- ════ TAB SWITCHER ════ -->
            <div class="flex items-end gap-0 border-b border-superadmin-border">
                <button @click="activeTab = 'restaurants'" id="tab-restaurants"
                        class="px-5 py-3 text-sm font-bold transition-all border-b-2"
                        :class="activeTab === 'restaurants'
                            ? 'border-saffron text-saffron'
                            : 'border-transparent text-slate-600 hover:text-slate-400'">
                    🏪 Restaurant Fleet
                    <span class="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                          :class="activeTab === 'restaurants' ? 'bg-saffron/15 text-saffron' : 'bg-white/5 text-slate-600'">
                        {{ restaurants.length }}
                    </span>
                </button>
                <button @click="activeTab = 'leads'; loadLeads()" id="tab-leads"
                        class="px-5 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2"
                        :class="activeTab === 'leads'
                            ? 'border-berry text-berry'
                            : 'border-transparent text-slate-600 hover:text-slate-400'">
                    📋 Beta Leads
                    <span v-if="leads.length > 0"
                          class="text-xs px-1.5 py-0.5 rounded-full bg-berry/15 text-berry font-black">
                        {{ leads.length }}
                    </span>
                </button>
            </div>

            <!-- ════ TOAST NOTIFICATION ════ -->
            <transition name="fade">
                <div v-if="toast"
                     class="fixed top-6 right-6 z-[9999] bg-emerald/10 border border-emerald/30 text-emerald
                            px-5 py-3 rounded-xl text-sm font-bold shadow-xl backdrop-blur-sm">
                    ✓ {{ toast }}
                </div>
            </transition>

            <!-- ════════════════════════════════════ -->
            <!-- TAB: RESTAURANT FLEET               -->
            <!-- ════════════════════════════════════ -->
            <template v-if="activeTab === 'restaurants'">

                <!-- ════ HEADER ════ -->
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 class="text-2xl font-black text-slate-100">Restaurant Fleet</h2>
                        <p class="text-sm text-slate-600 mt-0.5">{{ restaurants.length }} restaurant{{ restaurants.length !== 1 ? 's' : '' }} registered</p>
                    </div>
                    <button @click="openModal" id="restaurants-add-btn"
                            class="btn btn-saffron text-sm px-5 h-10 shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
                        </svg>
                        Add Restaurant
                    </button>
                </div>

                <!-- Loading skeleton -->
                <div v-if="loading" class="space-y-2">
                    <div v-for="i in 5" :key="i" class="skeleton h-16 rounded-xl"></div>
                </div>

                <!-- ════ DESKTOP TABLE ════ -->
                <div v-else class="hidden md:block overflow-x-auto rounded-2xl border border-superadmin-border">
                    <table class="table-dark" style="background: var(--superadmin-bg)">
                        <thead>
                            <tr>
                                <th>Restaurant</th>
                                <th>City</th>
                                <th>Contact</th>
                                <th>Wallet Balance</th>
                                <th>Vol. (30d)</th>
                                <th>Billing Tier</th>
                                <th>Status</th>
                                <th class="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="restaurants.length === 0">
                                <td colspan="8" class="text-center text-slate-700 py-10 text-sm italic">No restaurants found.</td>
                            </tr>
                            <tr v-for="r in restaurants" :key="r.id"
                                class="group"
                                style="background: var(--superadmin-bg); border-bottom-color: var(--superadmin-border)">
                                <td>
                                    <div class="font-bold text-slate-200 text-sm">{{ r.name }}</div>
                                    <div class="text-xs text-slate-700">ID #{{ r.id }}</div>
                                </td>
                                <td class="text-slate-500 text-sm">{{ r.city || '—' }}</td>
                                <td class="text-slate-500 text-xs">{{ r.contact_email }}</td>
                                <td>
                                    <span class="font-mono text-sm" :class="r.wallet_balance < 0 ? 'text-harissa font-bold' : 'text-slate-300'">
                                        {{ (r.wallet_balance || 0).toFixed(2) }} MAD
                                    </span>
                                </td>
                                <td class="text-slate-500 text-sm font-semibold">{{ r.orders_30d ?? '—' }}</td>
                                <td>
                                    <span class="badge" :class="billingBadge(r.commission_rate)">{{ billingTier(r.commission_rate) }}</span>
                                </td>
                                <td>
                                    <span class="badge" :class="r.status === 'active' ? 'badge-emerald' : 'badge-harissa'">
                                        {{ r.status === 'active' ? '● Active' : '✕ Suspended' }}
                                    </span>
                                </td>
                                <td class="text-right">
                                    <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button @click="openCreditModal(r)"
                                                :id="'restaurant-credit-' + r.id"
                                                class="btn btn-ghost text-xs px-3 h-8 text-saffron">Credit</button>
                                        <button @click="editRestaurant(r)"
                                                :id="'restaurant-edit-' + r.id"
                                                class="btn btn-ghost text-xs px-3 h-8">Edit</button>
                                        <button v-if="r.status === 'active'"
                                                @click="promptSuspend(r)"
                                                :id="'restaurant-suspend-' + r.id"
                                                class="btn btn-danger text-xs px-3 h-8">Suspend</button>
                                        <button v-else
                                                @click="activate(r.id)"
                                                :id="'restaurant-activate-' + r.id"
                                                class="btn text-xs px-3 h-8 bg-emerald/10 text-emerald border border-emerald/30 hover:bg-emerald/20">Activate</button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- ════ MOBILE CARD LIST ════ -->
                <div class="md:hidden space-y-3">
                    <div v-if="restaurants.length === 0" class="card-dark p-8 text-center text-slate-600 text-sm">No restaurants found.</div>
                    <div v-for="r in restaurants" :key="r.id"
                         class="card-superadmin p-4 hover-glow-saffron transition-all">
                        <div class="flex items-start justify-between mb-3">
                            <div>
                                <div class="font-black text-slate-100">{{ r.name }}</div>
                                <div class="text-xs text-slate-600 mt-0.5">{{ r.contact_email }}</div>
                                <div class="text-xs mt-1" :class="r.wallet_balance < 0 ? 'text-harissa font-bold' : 'text-slate-400'">
                                    Wallet: {{ (r.wallet_balance || 0).toFixed(2) }} MAD
                                </div>
                            </div>
                            <span class="badge" :class="r.status === 'active' ? 'badge-emerald' : 'badge-harissa'">
                                {{ r.status === 'active' ? 'Active' : 'Suspended' }}
                            </span>
                        </div>
                        <div class="flex gap-2">
                            <button @click="openCreditModal(r)" class="btn btn-ghost text-xs h-9 flex-1 text-saffron">Credit</button>
                            <button @click="editRestaurant(r)" class="btn btn-ghost text-xs h-9 flex-1">Edit</button>
                            <button v-if="r.status === 'active'" @click="promptSuspend(r)" class="btn btn-danger text-xs h-9 flex-1">Suspend</button>
                            <button v-else @click="activate(r.id)" class="btn text-xs h-9 flex-1 bg-emerald/10 text-emerald border border-emerald/30">Activate</button>
                        </div>
                    </div>
                </div>

            </template>

            <!-- ════════════════════════════════════ -->
            <!-- TAB: BETA LEADS                     -->
            <!-- ════════════════════════════════════ -->
            <template v-if="activeTab === 'leads'">

                <!-- ════ HEADER ════ -->
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 class="text-2xl font-black text-slate-100">Pending Beta Leads</h2>
                        <p class="text-sm text-slate-600 mt-0.5">{{ leads.length }} lead{{ leads.length !== 1 ? 's' : '' }} awaiting provisioning</p>
                    </div>
                    <button @click="loadLeads" id="leads-refresh-btn"
                            class="btn btn-ghost text-sm px-4 h-10 shrink-0">↻ Refresh</button>
                </div>

                <!-- Loading skeleton -->
                <div v-if="leadsLoading" class="space-y-2">
                    <div v-for="i in 4" :key="i" class="skeleton h-16 rounded-xl"></div>
                </div>

                <!-- ════ LEADS TABLE (desktop) ════ -->
                <div v-else class="hidden md:block overflow-x-auto rounded-2xl border border-superadmin-border">
                    <table class="table-dark" style="background: var(--superadmin-bg)">
                        <thead>
                            <tr>
                                <th>Restaurant</th>
                                <th>Manager</th>
                                <th>Email</th>
                                <th>Card</th>
                                <th>Signed up</th>
                                <th class="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="leads.length === 0">
                                <td colspan="6" class="text-center text-slate-700 py-10 text-sm italic">No pending leads. All caught up! 🎉</td>
                            </tr>
                            <tr v-for="lead in leads" :key="lead.id" class="group"
                                style="background: var(--superadmin-bg); border-bottom-color: var(--superadmin-border)">
                                <td>
                                    <div class="font-bold text-slate-200 text-sm">{{ lead.restaurant_name }}</div>
                                </td>
                                <td class="text-slate-400 text-sm">{{ lead.manager_name }}</td>
                                <td class="text-slate-500 text-xs font-mono">{{ lead.email }}</td>
                                <td>
                                    <span class="badge badge-slate font-mono">{{ lead.card_code }}</span>
                                </td>
                                <td class="text-slate-600 text-xs">{{ formatDate(lead.created_at) }}</td>
                                <td class="text-right">
                                    <button @click="openProvisionModal(lead)"
                                            :id="'lead-onboard-' + lead.id"
                                            class="btn btn-saffron text-xs px-4 h-8">
                                        ⚡ Onboard
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- ════ LEADS MOBILE CARDS ════ -->
                <div class="md:hidden space-y-3">
                    <div v-if="leads.length === 0" class="card-dark p-8 text-center text-slate-600 text-sm">No pending leads. All caught up! 🎉</div>
                    <div v-for="lead in leads" :key="lead.id" class="card-superadmin p-4 hover-glow-saffron">
                        <div class="mb-3">
                            <div class="font-black text-slate-100">{{ lead.restaurant_name }}</div>
                            <div class="text-xs text-slate-500 mt-0.5">{{ lead.email }}</div>
                            <span class="badge badge-slate font-mono mt-1 inline-block">{{ lead.card_code }}</span>
                        </div>
                        <button @click="openProvisionModal(lead)" class="btn btn-saffron text-xs h-9 w-full">⚡ Onboard</button>
                    </div>
                </div>

            </template>

            <!-- ════ SUSPENSION CONFIRMATION SHEET ════ -->
            <template v-if="suspendTarget">
                <div class="bottom-sheet-backdrop" @click="suspendTarget = null"></div>
                <div class="bottom-sheet">
                    <div class="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-5"></div>
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-harissa/15 flex items-center justify-center text-harissa text-xl shrink-0">⚠️</div>
                        <div>
                            <h3 class="text-lg font-black text-slate-100">Suspend Restaurant?</h3>
                            <p class="text-xs text-slate-500">{{ suspendTarget.name }}</p>
                        </div>
                    </div>
                    <p class="text-sm text-slate-400 mb-2">
                        This will <span class="text-harissa font-bold">immediately invalidate</span> the restaurant's webhook config.
                        Customers messaging them will receive a maintenance notification.
                    </p>
                    <p class="text-xs text-slate-600 mb-6 font-mono bg-superadmin-bg border border-superadmin-border rounded-lg px-3 py-2">
                        "Ce restaurant est temporairement en maintenance…"
                    </p>
                    <div class="flex gap-3">
                        <button @click="suspendTarget = null" id="suspend-cancel-btn" class="btn btn-ghost flex-1">Cancel</button>
                        <button @click="confirmSuspend" id="suspend-confirm-btn" class="btn btn-danger flex-1 font-bold">Yes, Suspend</button>
                    </div>
                </div>
            </template>

            <!-- ════ ADD / EDIT RESTAURANT MODAL ════ -->
            <template v-if="showCreate">
                <div class="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-superadmin-border shadow-2xl"
                         style="background: var(--superadmin-bg)">
                        <div class="px-6 pt-6 pb-4 border-b border-superadmin-border">
                            <h3 class="text-lg font-black text-slate-100">
                                {{ editingId ? 'Edit Restaurant' : 'Register New Restaurant' }}
                            </h3>
                        </div>

                        <div class="px-6 py-5 space-y-4">
                            <div class="grid grid-cols-2 gap-4">
                                <div class="col-span-2">
                                    <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Restaurant Name *</label>
                                    <input v-model="form.name" id="form-name" type="text" class="input-dark" placeholder="Pizzeria Al-Andalus">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Contact Email</label>
                                    <input v-model="form.contact_email" id="form-email" type="email" class="input-dark" placeholder="owner@example.com">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">City</label>
                                    <input v-model="form.city" id="form-city" type="text" class="input-dark" placeholder="Casablanca">
                                </div>
                                <div class="col-span-2">
                                    <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">WhatsApp Phone Number</label>
                                    <input v-model="form.wa_phone_number" id="form-phone" type="text" class="input-dark" placeholder="+212600000000">
                                </div>
                                <div class="col-span-2">
                                    <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Meta Phone Number ID</label>
                                    <input v-model="form.phone_number_id" id="form-phone-id" type="text" class="input-dark">
                                </div>
                                <div class="col-span-2">
                                    <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                        Permanent API Token
                                        <span class="text-slate-700 normal-case font-normal ml-1">(leave blank to use platform master token)</span>
                                    </label>
                                    <textarea v-model="form.api_token" id="form-api-token" class="input-dark h-16 resize-none" autocomplete="off"></textarea>
                                </div>
                                <div class="col-span-2">
                                    <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Owner WhatsApp ID (manager notifications)</label>
                                    <input v-model="form.owner_wa_id" id="form-owner-wa" type="text" class="input-dark" placeholder="212611223344">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Commission Rate (0–1)</label>
                                    <input v-model.number="form.commission_rate" id="form-commission" type="number" step="0.01" min="0" max="1" class="input-dark">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Cuisine Type</label>
                                    <input v-model="form.cuisine_type" id="form-cuisine" type="text" class="input-dark" placeholder="Fast Food">
                                </div>
                            </div>

                            <div v-if="error" class="p-3 rounded-xl bg-harissa/10 border border-harissa/30 text-harissa text-sm">{{ error }}</div>
                        </div>

                        <div class="px-6 pb-6 flex gap-3 border-t border-superadmin-border pt-4">
                            <button @click="showCreate = false" id="modal-cancel-btn" class="btn btn-ghost flex-1">Cancel</button>
                            <button @click="save" id="modal-save-btn" class="btn btn-saffron flex-1">
                                {{ editingId ? 'Save Changes' : 'Create Restaurant' }}
                            </button>
                        </div>
                    </div>
                </div>
            </template>

            <!-- ════ PROVISION MODAL ════ -->
            <template v-if="showProvision">
                <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div class="w-full max-w-md rounded-2xl border border-superadmin-border shadow-2xl"
                         style="background: var(--superadmin-bg)">

                        <!-- Header -->
                        <div class="px-6 pt-6 pb-4 border-b border-superadmin-border">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-xl bg-saffron/15 flex items-center justify-center text-saffron text-lg">⚡</div>
                                <div>
                                    <h3 class="text-base font-black text-slate-100">1-Click Onboarding</h3>
                                    <p class="text-xs text-slate-600">{{ provisionLead?.restaurant_name }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Pre-filled info (read-only) -->
                        <div class="px-6 pt-5 pb-2 space-y-3">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Restaurant</label>
                                    <div class="input-dark bg-white/[0.03] text-slate-400 text-sm truncate">{{ provisionLead?.restaurant_name }}</div>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Manager</label>
                                    <div class="input-dark bg-white/[0.03] text-slate-400 text-sm truncate">{{ provisionLead?.manager_name }}</div>
                                </div>
                                <div class="col-span-2">
                                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email (owner account)</label>
                                    <div class="input-dark bg-white/[0.03] text-slate-400 text-sm font-mono">{{ provisionLead?.email }}</div>
                                </div>
                            </div>

                            <div class="border-t border-superadmin-border pt-3 space-y-3">
                                <p class="text-xs text-slate-600 font-semibold uppercase tracking-wider">Meta WhatsApp Details — required</p>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Meta Phone Number ID *
                                    </label>
                                    <input v-model="provisionForm.phone_number_id"
                                           id="provision-phone-id"
                                           type="text" class="input-dark"
                                           placeholder="1234567890123456">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        WhatsApp Phone Number *
                                    </label>
                                    <input v-model="provisionForm.wa_phone_number"
                                           id="provision-wa-number"
                                           type="text" class="input-dark"
                                           placeholder="+212600000000">
                                </div>
                            </div>

                            <div v-if="provisionError" class="p-3 rounded-xl bg-harissa/10 border border-harissa/30 text-harissa text-sm">
                                {{ provisionError }}
                            </div>
                        </div>

                        <!-- Footer -->
                        <div class="px-6 pb-6 flex gap-3 pt-4">
                            <button @click="closeProvisionModal" id="provision-cancel-btn"
                                    class="btn btn-ghost flex-1">Cancel</button>
                            <button @click="submitProvision" id="provision-submit-btn"
                                    :disabled="provisionLoading"
                                    class="btn btn-saffron flex-1 font-bold">
                                <span v-if="provisionLoading"
                                      class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2 inline-block"></span>
                                {{ provisionLoading ? 'Provisioning…' : '⚡ Provision Restaurant' }}
                            </button>
                        </div>
                    </div>
                </div>
            </template>

            <!-- ════ CREDIT MODAL ════ -->
            <template v-if="showCredit">
                <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div class="w-full max-w-sm rounded-2xl border border-superadmin-border shadow-2xl"
                         style="background: var(--superadmin-bg)">
                        <div class="px-6 pt-6 pb-4 border-b border-superadmin-border">
                            <h3 class="text-lg font-black text-slate-100">Credit Wallet</h3>
                            <p class="text-xs text-slate-500">{{ creditTarget?.name }}</p>
                        </div>
                        <div class="px-6 py-5">
                            <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Amount (MAD)</label>
                            <input v-model.number="creditAmount" type="number" step="0.01" class="input-dark w-full text-lg font-mono" placeholder="100.00">
                            <div v-if="creditError" class="mt-3 p-3 rounded-xl bg-harissa/10 border border-harissa/30 text-harissa text-sm">
                                {{ creditError }}
                            </div>
                        </div>
                        <div class="px-6 pb-6 flex gap-3">
                            <button @click="showCredit = false" class="btn btn-ghost flex-1">Cancel</button>
                            <button @click="submitCredit" :disabled="creditLoading" class="btn btn-saffron flex-1 font-bold">
                                <span v-if="creditLoading" class="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full mr-2 inline-block align-middle"></span>
                                {{ creditLoading ? 'Processing...' : 'Confirm' }}
                            </button>
                        </div>
                    </div>
                </div>
            </template>

        </div>
    `,

    setup() {
        // ── Restaurants tab ───────────────────────────────────────────────
        const restaurants   = ref([]);
        const loading       = ref(true);
        const showCreate    = ref(false);
        const error         = ref('');
        const suspendTarget = ref(null);
        const activeTab     = ref('restaurants');

        const emptyForm = () => ({
            name: '', wa_phone_number: '', api_token: '', phone_number_id: '',
            owner_wa_id: '', cuisine_type: '', contact_email: '',
            city: '', commission_rate: 0.20,
        });

        const form      = ref(emptyForm());
        const editingId = ref(null);

        // ── Beta Leads tab ────────────────────────────────────────────────
        const leads          = ref([]);
        const leadsLoading   = ref(false);
        const showProvision  = ref(false);
        const provisionLead  = ref(null);
        const provisionForm  = ref({ phone_number_id: '', wa_phone_number: '' });
        const provisionError = ref('');
        const provisionLoading = ref(false);
        const toast          = ref('');

        // ── Credit Wallet ─────────────────────────────────────────────────
        const showCredit = ref(false);
        const creditTarget = ref(null);
        const creditAmount = ref(0);
        const creditLoading = ref(false);
        const creditError = ref('');

        const openCreditModal = (r) => {
            creditTarget.value = r;
            creditAmount.value = 0;
            creditError.value = '';
            showCredit.value = true;
        };

        const submitCredit = async () => {
            if (creditAmount.value <= 0) {
                creditError.value = 'Amount must be greater than 0';
                return;
            }
            creditLoading.value = true;
            creditError.value = '';
            try {
                await api.post(`/admin/restaurants/${creditTarget.value.id}/credit`, { amount: creditAmount.value });
                showToast(`Credited ${creditAmount.value} MAD to ${creditTarget.value.name}`);
                showCredit.value = false;
                await loadRestaurants();
            } catch (err) {
                creditError.value = err.response?.data?.detail || 'Failed to credit wallet.';
            } finally {
                creditLoading.value = false;
            }
        };

        // ── Toast helper ──────────────────────────────────────────────────
        const showToast = (msg) => {
            toast.value = msg;
            setTimeout(() => { toast.value = ''; }, 4000);
        };

        // ── Date formatter ────────────────────────────────────────────────
        const formatDate = (iso) => {
            if (!iso) return '—';
            const d = new Date(iso);
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        };

        // ── Billing tier helpers ──────────────────────────────────────────
        const billingTier = (rate) => {
            if (rate >= 0.25) return 'Premium';
            if (rate >= 0.15) return 'Growth';
            return 'Starter';
        };
        const billingBadge = (rate) => {
            if (rate >= 0.25) return 'badge-saffron';
            if (rate >= 0.15) return 'badge-berry';
            return 'badge-slate';
        };

        // ── Restaurant CRUD ───────────────────────────────────────────────
        const loadRestaurants = async () => {
            loading.value = true;
            try {
                const res = await api.get('/admin/restaurants');
                restaurants.value = res.data;
            } catch (err) {
                console.error('[RestaurantsAdmin] load error', err);
            } finally {
                loading.value = false;
            }
        };

        const openModal = () => {
            editingId.value  = null;
            form.value       = emptyForm();
            error.value      = '';
            showCreate.value = true;
        };

        const editRestaurant = (r) => {
            editingId.value = r.id;
            form.value = {
                name: r.name || '',              wa_phone_number: r.wa_phone_number || '',
                api_token: r.api_token || '',    phone_number_id: r.phone_number_id || '',
                owner_wa_id: r.owner_wa_id || '', cuisine_type: r.cuisine_type || '',
                contact_email: r.contact_email || '', city: r.city || '',
                commission_rate: r.commission_rate || 0.20,
            };
            error.value      = '';
            showCreate.value = true;
        };

        const save = async () => {
            error.value = '';
            if (!form.value.name.trim()) { error.value = 'Restaurant name is required.'; return; }
            try {
                if (editingId.value) {
                    await api.put(`/admin/restaurants/${editingId.value}`, form.value);
                } else {
                    await api.post('/admin/restaurants', form.value);
                }
                showCreate.value = false;
                editingId.value  = null;
                form.value       = emptyForm();
                await loadRestaurants();
            } catch (err) {
                error.value = err.response?.data?.detail || 'Failed to save.';
            }
        };

        const promptSuspend  = (r) => { suspendTarget.value = r; };
        const confirmSuspend = async () => {
            if (!suspendTarget.value) return;
            const id = suspendTarget.value.id;
            suspendTarget.value = null;
            try {
                await api.post(`/admin/restaurants/${id}/suspend`);
                await loadRestaurants();
            } catch (err) { console.error('[RestaurantsAdmin] suspend error', err); }
        };
        const activate = async (id) => {
            try {
                await api.post(`/admin/restaurants/${id}/activate`);
                await loadRestaurants();
            } catch (err) { console.error('[RestaurantsAdmin] activate error', err); }
        };

        // ── Beta Leads CRUD ───────────────────────────────────────────────
        const loadLeads = async () => {
            leadsLoading.value = true;
            try {
                const res = await api.get('/admin/beta-signups');
                leads.value = res.data;
            } catch (err) {
                console.error('[RestaurantsAdmin] leads load error', err);
            } finally {
                leadsLoading.value = false;
            }
        };

        const openProvisionModal = (lead) => {
            provisionLead.value  = lead;
            provisionForm.value  = { phone_number_id: '', wa_phone_number: lead.whatsapp_number || '' };
            provisionError.value = '';
            showProvision.value  = true;
        };

        const closeProvisionModal = () => {
            showProvision.value  = false;
            provisionLead.value  = null;
            provisionError.value = '';
        };

        const submitProvision = async () => {
            provisionError.value = '';

            if (!provisionForm.value.phone_number_id.trim()) {
                provisionError.value = 'Meta Phone Number ID is required.';
                return;
            }
            if (!provisionForm.value.wa_phone_number.trim()) {
                provisionError.value = 'WhatsApp Phone Number is required.';
                return;
            }

            provisionLoading.value = true;
            try {
                await api.post(
                    `/admin/beta-signups/${provisionLead.value.id}/provision`,
                    provisionForm.value
                );
                leads.value = leads.value.filter(l => l.id !== provisionLead.value.id);
                closeProvisionModal();
                showToast(`${provisionLead.value?.restaurant_name || 'Restaurant'} provisioned! Invite email sent.`);
                await loadRestaurants();
            } catch (err) {
                provisionError.value = err.response?.data?.detail || 'Provisioning failed. Please try again.';
            } finally {
                provisionLoading.value = false;
            }
        };

        onMounted(() => {
            loadRestaurants();
            loadLeads();
        });

        return {
            restaurants, loading, showCreate, error, form, editingId, suspendTarget,
            openModal, editRestaurant, save, promptSuspend, confirmSuspend, activate,
            billingTier, billingBadge,
            leads, leadsLoading, showProvision, provisionLead,
            provisionForm, provisionError, provisionLoading,
            loadLeads, openProvisionModal, closeProvisionModal, submitProvision,
            activeTab, toast, formatDate,
            showCredit, creditTarget, creditAmount, creditLoading, creditError, openCreditModal, submitCredit
        };
    }
};
