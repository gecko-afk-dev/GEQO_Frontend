import { ref, computed, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { api } from '../api.js';

const API_BASE = 'https://api.mygeqo.com/api/v1/admin';

export default {
    template: `
    <div style="background:#0A0A0A;min-height:100vh;font-family:'Inter',system-ui,sans-serif;color:#FAFAFA;padding:0;">

        <!-- ── Top Header Bar ──────────────────────────────────────── -->
        <div style="background:#111;border-bottom:1px solid #222;padding:20px 28px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
                <h1 style="font-size:22px;font-weight:900;color:#F59E0B;letter-spacing:-.5px;margin:0;">
                    📊 Insights &amp; Rapports
                </h1>
                <p style="font-size:12px;color:#555;margin:4px 0 0;letter-spacing:.5px;text-transform:uppercase;">
                    SuperAdmin Control Room · Plate-forme GEQO
                </p>
            </div>

            <!-- Month/Year picker -->
            <div style="display:flex;gap:10px;align-items:center;">
                <select v-model.number="selectedMonth" style="background:#1A1A1A;border:1px solid #333;color:#FAFAFA;padding:8px 12px;border-radius:8px;font-size:13px;cursor:pointer;">
                    <option v-for="(m,i) in months" :key="i" :value="i+1">{{ m }}</option>
                </select>
                <select v-model.number="selectedYear" style="background:#1A1A1A;border:1px solid #333;color:#FAFAFA;padding:8px 12px;border-radius:8px;font-size:13px;cursor:pointer;">
                    <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
                </select>
                <button @click="loadRestaurants" style="background:#222;border:1px solid #333;color:#FAFAFA;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;transition:background .2s;"
                    @mouseenter="e=>e.target.style.background='#2A2A2A'" @mouseleave="e=>e.target.style.background='#222'">
                    🔄 Actualiser
                </button>
            </div>
        </div>

        <!-- ── Platform KPI Strip ─────────────────────────────────── -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#1A1A1A;border-bottom:1px solid #222;">
            <div v-for="kpi in platformKpis" :key="kpi.label"
                 style="background:#141414;padding:18px 22px;">
                <div style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:.8px;font-weight:700;margin-bottom:6px;">{{ kpi.label }}</div>
                <div :style="{fontSize:'24px',fontWeight:'900',color:kpi.color||'#F59E0B',letterSpacing:'-.5px'}">{{ kpi.value }}</div>
            </div>
        </div>

        <!-- ── Error Banner ───────────────────────────────────────── -->
        <div v-if="errorMsg" style="margin:16px 28px;padding:12px 16px;background:#3B0808;border:1px solid #7F1D1D;border-radius:10px;color:#FCA5A5;font-size:13px;font-weight:600;">
            ⚠️ {{ errorMsg }}
        </div>

        <!-- ── Success / Progress Banner ─────────────────────────── -->
        <div v-if="dispatchStatus" :style="{
            margin:'16px 28px',padding:'12px 16px',borderRadius:'10px',fontSize:'13px',fontWeight:'600',
            background: dispatchStatus.type === 'success' ? '#052E16' : dispatchStatus.type === 'progress' ? '#1C1917' : '#3B0808',
            border: '1px solid ' + (dispatchStatus.type === 'success' ? '#166534' : dispatchStatus.type === 'progress' ? '#44403C' : '#7F1D1D'),
            color: dispatchStatus.type === 'success' ? '#86EFAC' : dispatchStatus.type === 'progress' ? '#A8A29E' : '#FCA5A5',
        }">
            {{ dispatchStatus.msg }}
        </div>

        <!-- ── Main Table Area ────────────────────────────────────── -->
        <div style="padding:20px 28px;">

            <!-- Bulk Action Bar -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
                <div style="font-size:13px;color:#666;">
                    <span style="color:#F59E0B;font-weight:700;">{{ selectedRestoIds.length }}</span>
                    restaurant(s) sélectionné(s) sur {{ restaurants.length }}
                </div>
                <button
                    @click="batchDispatch"
                    :disabled="selectedRestoIds.length === 0 || dispatching"
                    :style="{
                        background: selectedRestoIds.length === 0 || dispatching ? '#1C1917' : 'linear-gradient(135deg,#F59E0B,#D97706)',
                        color: selectedRestoIds.length === 0 || dispatching ? '#44403C' : '#0A0A0A',
                        border: 'none',
                        padding: '10px 22px',
                        borderRadius: '10px',
                        fontWeight: '800',
                        fontSize: '13px',
                        cursor: selectedRestoIds.length === 0 || dispatching ? 'not-allowed' : 'pointer',
                        letterSpacing: '.2px',
                        transition: 'all .2s',
                        boxShadow: selectedRestoIds.length > 0 && !dispatching ? '0 4px 20px rgba(245,158,11,.3)' : 'none',
                    }"
                >
                    <span v-if="dispatching">⏳ Envoi en cours… ({{ dispatchProgress }}/{{ selectedRestoIds.length }})</span>
                    <span v-else>🚀 Envoyer les Rapports Sélectionnés ({{ selectedRestoIds.length }})</span>
                </button>
            </div>

            <!-- Loading -->
            <div v-if="loading" style="text-align:center;padding:60px;color:#555;font-size:14px;">
                <div style="width:32px;height:32px;border:2px solid #333;border-top-color:#F59E0B;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 12px;"></div>
                Chargement des données…
            </div>

            <!-- Table -->
            <div v-else style="background:#141414;border:1px solid #1E1E1E;border-radius:14px;overflow:hidden;">
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <!-- Header -->
                    <thead>
                        <tr style="background:#0A0A0A;border-bottom:1px solid #222;">
                            <th style="padding:14px 16px;text-align:left;width:40px;">
                                <input type="checkbox"
                                    :checked="allSelected"
                                    :indeterminate.prop="someSelected && !allSelected"
                                    @change="toggleSelectAll"
                                    style="width:16px;height:16px;cursor:pointer;accent-color:#F59E0B;"
                                    title="Tout sélectionner"
                                />
                            </th>
                            <th style="padding:14px 16px;text-align:left;color:#555;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.8px;">Resto</th>
                            <th style="padding:14px 16px;text-align:left;color:#555;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.8px;">Tier & Statut</th>
                            <th style="padding:14px 16px;text-align:right;color:#555;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.8px;">Portefeuille</th>
                            <th style="padding:14px 16px;text-align:right;color:#555;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.8px;">Volume 30J</th>
                            <th style="padding:14px 16px;text-align:center;color:#555;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.8px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="restaurants.length === 0">
                            <td colspan="6" style="padding:48px;text-align:center;color:#444;font-size:14px;">
                                Aucun restaurant trouvé.
                            </td>
                        </tr>
                        <tr v-for="(r, idx) in restaurants" :key="r.id"
                            :style="{
                                background: selectedRestoIds.includes(r.id) ? '#1A1400' : idx % 2 === 0 ? '#141414' : '#111',
                                borderBottom: '1px solid #1E1E1E',
                                transition: 'background .15s',
                            }"
                            @mouseenter="e=>{ if(!selectedRestoIds.includes(r.id)) e.currentTarget.style.background='#1A1A1A' }"
                            @mouseleave="e=>{ e.currentTarget.style.background = selectedRestoIds.includes(r.id) ? '#1A1400' : idx%2===0?'#141414':'#111' }"
                        >
                            <!-- Checkbox -->
                            <td style="padding:14px 16px;">
                                <input type="checkbox"
                                    :value="r.id"
                                    v-model="selectedRestoIds"
                                    style="width:16px;height:16px;cursor:pointer;accent-color:#F59E0B;"
                                />
                            </td>

                            <!-- Resto info -->
                            <td style="padding:14px 16px;">
                                <div style="font-weight:700;color:#FAFAFA;">{{ r.name }}</div>
                                <div style="font-size:11px;color:#555;margin-top:2px;">
                                    #{{ r.id }} · {{ r.city || 'N/A' }}
                                </div>
                            </td>

                            <!-- Tier & Status -->
                            <td style="padding:14px 16px;">
                                <span :style="statusBadgeStyle(r.status)" style="padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;display:inline-block;">
                                    {{ r.status }}
                                </span>
                                <span v-if="r.payment_status !== 'paid'"
                                    style="margin-left:6px;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;background:#3B0808;color:#FCA5A5;display:inline-block;">
                                    {{ r.payment_status }}
                                </span>
                            </td>

                            <!-- Wallet -->
                            <td style="padding:14px 16px;text-align:right;">
                                <div :style="{fontWeight:'800',fontSize:'15px',color: r.wallet_balance < 0 ? '#F87171' : '#05CD99'}">
                                    {{ r.wallet_balance.toFixed(2) }} MAD
                                </div>
                                <div v-if="r.wallet_balance < 0" style="font-size:10px;color:#555;margin-top:2px;">
                                    Buffer: {{ Math.abs(Math.round(r.wallet_balance / 3)) }}/25 commandes
                                </div>
                            </td>

                            <!-- Volume 30D (from analytics) -->
                            <td style="padding:14px 16px;text-align:right;">
                                <div style="font-weight:700;color:#FAFAFA;">{{ (analyticsMap[r.id]?.orders_month || 0) }} cmd</div>
                                <div style="font-size:11px;color:#555;margin-top:2px;">{{ (analyticsMap[r.id]?.revenue_month || 0).toFixed(0) }} MAD</div>
                            </td>

                            <!-- Actions -->
                            <td style="padding:14px 16px;text-align:center;">
                                <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
                                    <!-- CSV -->
                                    <a :href="getCrmExportUrl(r.id)" target="_blank"
                                        style="padding:6px 10px;background:#1E293B;border:1px solid #334155;color:#94A3B8;border-radius:7px;font-size:11px;font-weight:700;text-decoration:none;transition:all .2s;"
                                        @mouseenter="e=>{e.target.style.background='#334155';e.target.style.color='#E2E8F0'}"
                                        @mouseleave="e=>{e.target.style.background='#1E293B';e.target.style.color='#94A3B8'}"
                                        title="Télécharger données CRM (CSV)">
                                        📥 CSV
                                    </a>
                                    <!-- PDF Preview -->
                                    <a :href="getPdfPreviewUrl(r.id)" target="_blank"
                                        style="padding:6px 10px;background:#1A1400;border:1px solid #44400;color:#D97706;border-radius:7px;font-size:11px;font-weight:700;text-decoration:none;transition:all .2s;border-color:#44340A;"
                                        @mouseenter="e=>{e.target.style.background='#292100';}"
                                        @mouseleave="e=>{e.target.style.background='#1A1400';}"
                                        title="Prévisualiser le rapport PDF">
                                        👁️ PDF
                                    </a>
                                    <!-- Single Dispatch -->
                                    <button @click="dispatchSinglePdf(r.id, r.name)"
                                        :disabled="dispatching"
                                        style="padding:6px 10px;background:#052E16;border:1px solid #166534;color:#86EFAC;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;"
                                        @mouseenter="e=>{if(!dispatching)e.target.style.background='#14532D'}"
                                        @mouseleave="e=>{e.target.style.background='#052E16'}"
                                        title="Envoyer le rapport à ce restaurant">
                                        🚀 Envoyer
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Spin animation -->
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>
    `,

    setup() {
        const now = new Date();
        const selectedMonth = ref(now.getMonth() + 1);
        const selectedYear = ref(now.getFullYear());
        const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
        const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

        const restaurants = ref([]);
        const analyticsMap = ref({});
        const loading = ref(true);
        const errorMsg = ref('');
        const selectedRestoIds = ref([]);
        const dispatching = ref(false);
        const dispatchProgress = ref(0);
        const dispatchStatus = ref(null);

        // Platform KPI strip
        const platformKpis = computed(() => {
            const active = restaurants.value.filter(r => r.status === 'active').length;
            const totalOrders = Object.values(analyticsMap.value).reduce((s, a) => s + (a.orders_month || 0), 0);
            const totalGmv = Object.values(analyticsMap.value).reduce((s, a) => s + (a.revenue_month || 0), 0);
            const totalTolls = totalOrders * 3;
            return [
                { label: 'Restos Actifs', value: active, color: '#05CD99' },
                { label: 'Commandes 30J', value: totalOrders.toLocaleString('fr-FR'), color: '#F59E0B' },
                { label: 'GMV 30J (MAD)', value: totalGmv.toFixed(0) + ' MAD', color: '#FAFAFA' },
                { label: 'Tolls Collectés', value: totalTolls.toFixed(0) + ' MAD', color: '#F59E0B' },
            ];
        });

        const allSelected = computed(() =>
            restaurants.value.length > 0 && selectedRestoIds.value.length === restaurants.value.length
        );
        const someSelected = computed(() => selectedRestoIds.value.length > 0);

        const toggleSelectAll = () => {
            if (allSelected.value) {
                selectedRestoIds.value = [];
            } else {
                selectedRestoIds.value = restaurants.value.map(r => r.id);
            }
        };

        const statusBadgeStyle = (status) => ({
            background: status === 'active' ? '#052E16' : status === 'suspended' ? '#3B0808' : '#1C1917',
            color: status === 'active' ? '#86EFAC' : status === 'suspended' ? '#FCA5A5' : '#A8A29E',
        });

        const getCrmExportUrl = (restaurantId) =>
            `${API_BASE}/crm/export/${restaurantId}`;

        const getPdfPreviewUrl = (restaurantId) =>
            `${API_BASE}/reports/preview/${restaurantId}?month=${selectedMonth.value}&year=${selectedYear.value}`;

        const loadRestaurants = async () => {
            loading.value = true;
            errorMsg.value = '';
            try {
                const [restoRes, analyticsRes] = await Promise.all([
                    api.get('/admin/restaurants'),
                    api.get('/admin/analytics/restaurants'),
                ]);
                restaurants.value = restoRes.data;
                // Build analytics map keyed by restaurant_id
                const map = {};
                for (const a of (analyticsRes.data || [])) {
                    map[a.restaurant_id] = a;
                }
                analyticsMap.value = map;
            } catch (err) {
                errorMsg.value = 'Impossible de charger les données. Vérifiez votre connexion ou les droits admin.';
                console.error('[SuperAdminInsights] load error', err);
            } finally {
                loading.value = false;
            }
        };

        const dispatchSinglePdf = async (restaurantId, name) => {
            if (dispatching.value) return;
            dispatching.value = true;
            dispatchProgress.value = 0;
            dispatchStatus.value = { type: 'progress', msg: `⏳ Envoi du rapport pour ${name}…` };
            try {
                const res = await api.post('/admin/reports/batch-dispatch', {
                    restaurant_ids: [restaurantId],
                    month: selectedMonth.value,
                    year: selectedYear.value,
                });
                const d = res.data;
                dispatchStatus.value = d.dispatched > 0
                    ? { type: 'success', msg: `✅ Rapport envoyé à ${name} avec succès.` }
                    : { type: 'error', msg: `❌ Échec de l'envoi pour ${name}. Vérifiez les logs.` };
            } catch (err) {
                dispatchStatus.value = { type: 'error', msg: `❌ Erreur réseau lors de l'envoi pour ${name}.` };
            } finally {
                dispatching.value = false;
            }
        };

        const batchDispatch = async () => {
            if (selectedRestoIds.value.length === 0 || dispatching.value) return;
            dispatching.value = true;
            dispatchProgress.value = 0;
            const total = selectedRestoIds.value.length;
            dispatchStatus.value = { type: 'progress', msg: `⏳ Envoi de 0/${total} rapports en cours…` };
            try {
                // Send all in one API call — backend loops
                const res = await api.post('/admin/reports/batch-dispatch', {
                    restaurant_ids: selectedRestoIds.value,
                    month: selectedMonth.value,
                    year: selectedYear.value,
                });
                const d = res.data;
                dispatchStatus.value = {
                    type: d.failed === 0 ? 'success' : 'progress',
                    msg: `✅ ${d.dispatched}/${d.total_requested} rapports envoyés.` +
                         (d.failed > 0 ? ` ⚠️ ${d.failed} échec(s) — IDs: ${(d.failed_ids || []).join(', ')}` : ''),
                };
                selectedRestoIds.value = [];
            } catch (err) {
                dispatchStatus.value = { type: 'error', msg: '❌ Erreur réseau lors du dispatch batch.' };
                console.error('[SuperAdminInsights] batch dispatch error', err);
            } finally {
                dispatching.value = false;
            }
        };

        onMounted(loadRestaurants);

        return {
            restaurants, analyticsMap, loading, errorMsg,
            selectedRestoIds, allSelected, someSelected, toggleSelectAll,
            dispatching, dispatchProgress, dispatchStatus,
            platformKpis, statusBadgeStyle,
            months, years, selectedMonth, selectedYear,
            getCrmExportUrl, getPdfPreviewUrl,
            dispatchSinglePdf, batchDispatch, loadRestaurants,
        };
    }
};
