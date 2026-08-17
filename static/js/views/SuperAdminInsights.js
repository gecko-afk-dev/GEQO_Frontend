import {
  ref,
  computed,
  onMounted,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { api } from "../api.js";

const API_BASE = "https://api.mygeqo.com/api/v1/admin";

export default {
  // ── Props — receives user from Dashboard ─────────────────────────────────
  props: {
    user: { type: Object, required: true },
  },

  template: `
    <div style="background:#0A0A0A;min-height:100vh;font-family:'Inter',system-ui,sans-serif;color:#FAFAFA;padding:0;">

        <!-- ── Top Header Bar ──────────────────────────────────────────────── -->
        <div style="background:#111;border-bottom:1px solid #222;padding:20px 28px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
                <h1 style="font-size:22px;font-weight:900;color:#F59E0B;letter-spacing:-.5px;margin:0;">
                    📊 Insights &amp; Rapports
                </h1>
                <p style="font-size:12px;color:#555;margin:4px 0 0;letter-spacing:.5px;text-transform:uppercase;">
                    <span v-if="isAdmin">SuperAdmin Control Room · Plate-forme GEQO</span>
                    <span v-else>Tableau de Bord Analytics · {{ myRestaurantName }}</span>
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
                <button @click="loadData" style="background:#222;border:1px solid #333;color:#FAFAFA;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;transition:background .2s;"
                    @mouseenter="e=>e.target.style.background='#2A2A2A'" @mouseleave="e=>e.target.style.background='#222'">
                    🔄 Actualiser
                </button>
            </div>
        </div>

        <!-- ── Platform KPI Strip ──────────────────────────────────────────── -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#1A1A1A;border-bottom:1px solid #222;">
            <div v-for="kpi in platformKpis" :key="kpi.label"
                 style="background:#141414;padding:18px 22px;">
                <div style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:.8px;font-weight:700;margin-bottom:6px;">{{ kpi.label }}</div>
                <div :style="{fontSize:'24px',fontWeight:'900',color:kpi.color||'#F59E0B',letterSpacing:'-.5px'}">{{ kpi.value }}</div>
            </div>
        </div>

        <!-- ── Error Banner ─────────────────────────────────────────────────── -->
        <div v-if="errorMsg" style="margin:16px 28px;padding:12px 16px;background:#3B0808;border:1px solid #7F1D1D;border-radius:10px;color:#FCA5A5;font-size:13px;font-weight:600;">
            ⚠️ {{ errorMsg }}
        </div>

        <!-- ── Success / Progress Banner ───────────────────────────────────── -->
        <div v-if="dispatchStatus" :style="{
            margin:'16px 28px',padding:'12px 16px',borderRadius:'10px',fontSize:'13px',fontWeight:'600',
            background: dispatchStatus.type === 'success' ? '#052E16' : dispatchStatus.type === 'progress' ? '#1C1917' : '#3B0808',
            border: '1px solid ' + (dispatchStatus.type === 'success' ? '#166534' : dispatchStatus.type === 'progress' ? '#44403C' : '#7F1D1D'),
            color: dispatchStatus.type === 'success' ? '#86EFAC' : dispatchStatus.type === 'progress' ? '#A8A29E' : '#FCA5A5',
        }">
            {{ dispatchStatus.msg }}
        </div>

        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <!-- ── ADMIN VIEW: Fleet Table + Bulk Dispatch ─────────────────────── -->
        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <div v-if="isAdmin" style="padding:20px 28px;">

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

            <!-- Fleet Table -->
            <div v-else style="background:#141414;border:1px solid #1E1E1E;border-radius:14px;overflow:hidden;">
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
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
                            <th style="padding:14px 16px;text-align:left;color:#555;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.8px;">Statut</th>
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
                            <td style="padding:14px 16px;">
                                <input type="checkbox" :value="r.id" v-model="selectedRestoIds"
                                    style="width:16px;height:16px;cursor:pointer;accent-color:#F59E0B;" />
                            </td>
                            <td style="padding:14px 16px;">
                                <div style="font-weight:700;color:#FAFAFA;">{{ r.name }}</div>
                                <div style="font-size:11px;color:#555;margin-top:2px;">#{{ r.id }} · {{ r.city || 'N/A' }}</div>
                            </td>
                            <td style="padding:14px 16px;">
                                <span :style="statusBadgeStyle(r.status)" style="padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;display:inline-block;">
                                    {{ r.status }}
                                </span>
                                <span v-if="r.payment_status !== 'paid'"
                                    style="margin-left:6px;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;background:#3B0808;color:#FCA5A5;display:inline-block;">
                                    {{ r.payment_status }}
                                </span>
                            </td>
                            <td style="padding:14px 16px;text-align:right;">
                                <div :style="{fontWeight:'800',fontSize:'15px',color: r.wallet_balance < 0 ? '#F87171' : '#05CD99'}">
                                    {{ r.wallet_balance.toFixed(2) }} MAD
                                </div>
                                <div v-if="r.wallet_balance < 0" style="font-size:10px;color:#555;margin-top:2px;">
                                    Buffer: {{ Math.abs(Math.round(r.wallet_balance / 3)) }}/25
                                </div>
                            </td>
                            <td style="padding:14px 16px;text-align:right;">
                                <div style="font-weight:700;color:#FAFAFA;">{{ (analyticsMap[r.id]?.orders_month || 0) }} cmd</div>
                                <div style="font-size:11px;color:#555;margin-top:2px;">{{ (analyticsMap[r.id]?.revenue_month || 0).toFixed(0) }} MAD</div>
                            </td>
                            <td style="padding:14px 16px;text-align:center;">
                                <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
                                    <a :href="getCrmExportUrl(r.id)" target="_blank"
                                        style="padding:6px 10px;background:#1E293B;border:1px solid #334155;color:#94A3B8;border-radius:7px;font-size:11px;font-weight:700;text-decoration:none;transition:all .2s;"
                                        title="Télécharger CRM (CSV)">📥 CSV</a>
                                    <a :href="getPdfPreviewUrl(r.id)" target="_blank"
                                        style="padding:6px 10px;background:#1A1400;border:1px solid #44340A;color:#D97706;border-radius:7px;font-size:11px;font-weight:700;text-decoration:none;transition:all .2s;"
                                        title="Prévisualiser PDF">👁️ PDF</a>
                                    <button @click="dispatchSinglePdf(r.id, r.name)" :disabled="dispatching"
                                        style="padding:6px 10px;background:#052E16;border:1px solid #166534;color:#86EFAC;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;"
                                        title="Envoyer rapport">🚀 Envoyer</button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <!-- ── OWNER VIEW: Single-Venue Funnel + Peak Rush + Top Modifiers ─── -->
        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <div v-else style="padding:20px 28px;">

            <!-- Loading -->
            <div v-if="loading" style="text-align:center;padding:60px;color:#555;font-size:14px;">
                <div style="width:32px;height:32px;border:2px solid #333;border-top-color:#F59E0B;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 12px;"></div>
                Chargement des données…
            </div>

            <template v-else>
                <!-- ── PDF Report Block (Owner only) ──────────────────────────── -->
                <div v-if="!isAdmin" style="margin-bottom:24px;">

                    <!-- Loading PDF manifest -->
                    <div v-if="pdfLoading" style="background:#141414;border:1px solid #1E1E1E;border-radius:14px;padding:32px;text-align:center;color:#555;font-size:13px;">
                        <div style="width:24px;height:24px;border:2px solid #333;border-top-color:#F59E0B;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 10px;"></div>
                        Vérification du rapport PDF…
                    </div>

                    <!-- First Month Notice -->
                    <div v-else-if="pdfReport && !pdfReport.has_report"
                         style="background:#141414;border:1px solid rgba(245,158,11,0.3);border-radius:14px;padding:48px 32px;text-align:center;">
                        <div style="font-size:32px;margin-bottom:16px;">📊</div>
                        <h2 style="font-size:18px;font-weight:900;color:#F59E0B;letter-spacing:-.3px;text-transform:uppercase;margin:0 0 12px;">ANALYTIQUES MENSUELLES</h2>
                        <p style="font-size:14px;color:#666;max-width:420px;margin:0 auto;line-height:1.6;">
                            {{ pdfReport.message }}
                        </p>
                        <div style="margin-top:20px;font-size:11px;color:#444;font-family:monospace;">Rapport prévu pour fin {{ monthName(pdfReport.report_month) }} {{ pdfReport.report_year }}</div>
                    </div>

                    <!-- Report Available -->
                    <div v-else-if="pdfReport && pdfReport.has_report"
                         style="background:#141414;border:1px solid #1E1E1E;border-radius:14px;overflow:hidden;">
                        <div style="padding:20px 24px;border-bottom:1px solid #1E1E1E;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                            <div>
                                <h2 style="font-size:14px;font-weight:800;color:#F59E0B;text-transform:uppercase;letter-spacing:.8px;margin:0 0 4px;">📊 Rapport — {{ monthName(pdfReport.report_month) }} {{ pdfReport.report_year }}</h2>
                                <p style="font-size:12px;color:#555;margin:0;">{{ pdfReport.restaurant_name }}</p>
                            </div>
                            <a :href="'https://api.mygeqo.com' + pdfReport.pdf_url" target="_blank"
                               style="display:inline-flex;align-items:center;gap:6px;padding:10px 20px;background:linear-gradient(135deg,#F59E0B,#D97706);border:none;color:#0A0A0A;border-radius:10px;font-size:13px;font-weight:800;text-decoration:none;">
                                ⬇️ Télécharger le PDF
                            </a>
                        </div>
                        <iframe :src="'https://api.mygeqo.com' + pdfReport.pdf_url"
                                style="width:100%;height:520px;border:none;background:#111;"
                                title="Rapport mensuel PDF">
                        </iframe>
                    </div>

                    <!-- PDF Not Available (tier or error) -->
                    <div v-else-if="pdfError"
                         style="background:#141414;border:1px solid #1E1E1E;border-radius:14px;padding:32px;text-align:center;">
                        <p style="font-size:13px;color:#555;">{{ pdfError }}</p>
                    </div>
                </div>

                <!-- Quick Actions for Owner -->
                <div style="display:flex;gap:10px;margin-bottom:24px;flex-wrap:wrap;">
                    <a v-if="myRestaurantId" :href="getCrmExportUrl(myRestaurantId)" target="_blank"
                        style="display:inline-flex;align-items:center;gap:6px;padding:10px 18px;background:#1E293B;border:1px solid #334155;color:#94A3B8;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;transition:all .2s;"
                        @mouseenter="e=>e.target.style.color='#E2E8F0'" @mouseleave="e=>e.target.style.color='#94A3B8'">
                        📥 Exporter CRM (CSV)
                    </a>
                    <a v-if="myRestaurantId" :href="getPdfPreviewUrl(myRestaurantId)" target="_blank"
                        style="display:inline-flex;align-items:center;gap:6px;padding:10px 18px;background:#1A1400;border:1px solid #44340A;color:#D97706;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;transition:all .2s;"
                        @mouseenter="e=>e.target.style.background='#231C00'" @mouseleave="e=>e.target.style.background='#1A1400'">
                        👁️ Voir Rapport PDF
                    </a>
                    <button @click="dispatchSinglePdf(myRestaurantId, myRestaurantName)" :disabled="dispatching || !myRestaurantId"
                        style="display:inline-flex;align-items:center;gap:6px;padding:10px 18px;background:linear-gradient(135deg,#F59E0B,#D97706);border:none;color:#0A0A0A;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;transition:all .2s;">
                        <span v-if="dispatching">⏳ Envoi…</span>
                        <span v-else>🚀 Envoyer mon Rapport PDF</span>
                    </button>
                </div>

                <!-- PWA Conversion Funnel -->
                <div style="background:#141414;border:1px solid #1E1E1E;border-radius:14px;padding:24px;margin-bottom:20px;">
                    <h2 style="font-size:14px;font-weight:800;color:#F59E0B;text-transform:uppercase;letter-spacing:.8px;margin:0 0 20px;">
                        🔀 Entonnoir de Conversion PWA
                    </h2>
                    <div style="display:flex;flex-direction:column;gap:10px;">
                        <div v-for="(step, idx) in conversionFunnel" :key="step.label"
                             style="display:flex;align-items:center;gap:12px;">
                            <div style="width:120px;font-size:12px;color:#888;text-align:right;flex-shrink:0;">{{ step.label }}</div>
                            <div style="flex:1;background:#1C1C1C;border-radius:6px;overflow:hidden;height:28px;position:relative;">
                                <div :style="{
                                    width: step.pct + '%',
                                    background: idx === 0 ? '#F59E0B' : idx === 1 ? '#D97706' : idx === 2 ? '#B45309' : '#92400E',
                                    height: '100%',
                                    borderRadius: '6px',
                                    transition: 'width .8s ease',
                                    minWidth: step.count > 0 ? '4px' : '0',
                                }"></div>
                            </div>
                            <div style="width:80px;text-align:right;flex-shrink:0;">
                                <span style="font-weight:800;font-size:14px;color:#FAFAFA;">{{ step.count.toLocaleString('fr-FR') }}</span>
                                <span style="font-size:11px;color:#555;margin-left:4px;">{{ step.pct.toFixed(0) }}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Two-col: Peak Rush Hours + Top Metrics -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">

                    <!-- Peak Rush Curve (simulated hourly bar) -->
                    <div style="background:#141414;border:1px solid #1E1E1E;border-radius:14px;padding:24px;">
                        <h2 style="font-size:14px;font-weight:800;color:#05CD99;text-transform:uppercase;letter-spacing:.8px;margin:0 0 20px;">
                            ⚡ Rush Hours (30J)
                        </h2>
                        <div style="display:flex;align-items:flex-end;gap:4px;height:80px;">
                            <div v-for="(h, i) in peakHours" :key="i"
                                 :style="{
                                     flex:1, borderRadius:'4px 4px 0 0',
                                     background: h.peak ? '#05CD99' : '#1C2A27',
                                     height: Math.max(8, (h.val / maxPeak) * 80) + 'px',
                                     transition: 'height .6s ease',
                                     cursor: 'default',
                                 }"
                                 :title="h.label + ': ' + h.val + ' commandes'"
                            ></div>
                        </div>
                        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:10px;color:#444;">
                            <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
                        </div>
                        <div v-if="ownerAnalytics" style="margin-top:12px;font-size:12px;color:#555;">
                            Pic estimé autour de {{ peakHourLabel }} · {{ ownerAnalytics.orders_month }} cmd ce mois
                        </div>
                    </div>

                    <!-- Key metrics -->
                    <div style="background:#141414;border:1px solid #1E1E1E;border-radius:14px;padding:24px;">
                        <h2 style="font-size:14px;font-weight:800;color:#FAFAFA;text-transform:uppercase;letter-spacing:.8px;margin:0 0 20px;">
                            📈 Métriques Clés
                        </h2>
                        <div v-if="ownerAnalytics" style="display:flex;flex-direction:column;gap:14px;">
                            <div v-for="m in ownerMetrics" :key="m.label" style="display:flex;justify-content:space-between;align-items:center;">
                                <span style="font-size:12px;color:#666;">{{ m.label }}</span>
                                <span :style="{fontWeight:'800',fontSize:'15px',color:m.color||'#FAFAFA'}">{{ m.value }}</span>
                            </div>
                        </div>
                        <div v-else style="color:#444;font-size:13px;">Aucune donnée disponible.</div>
                    </div>
                </div>

                <!-- Wallet + Grace Period indicator -->
                <div v-if="myRestaurant" style="background:#141414;border:1px solid #1E1E1E;border-radius:14px;padding:24px;">
                    <h2 style="font-size:14px;font-weight:800;color:#F59E0B;text-transform:uppercase;letter-spacing:.8px;margin:0 0 16px;">
                        💳 Portefeuille & Tolérance
                    </h2>
                    <div style="display:flex;gap:24px;flex-wrap:wrap;">
                        <div>
                            <div style="font-size:11px;color:#555;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;">Solde Actuel</div>
                            <div :style="{fontSize:'28px',fontWeight:'900',color:myRestaurant.wallet_balance < 0 ? '#F87171' : '#05CD99'}">
                                {{ myRestaurant.wallet_balance.toFixed(2) }} MAD
                            </div>
                        </div>
                        <div v-if="myRestaurant.wallet_balance < 0">
                            <div style="font-size:11px;color:#555;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;">Buffer Utilisé</div>
                            <div style="font-size:28px;font-weight:900;color:#F59E0B;">
                                {{ Math.min(25, Math.abs(Math.round(myRestaurant.wallet_balance / 3))) }}<span style="font-size:14px;color:#555;font-weight:500;">/25 cmd</span>
                            </div>
                        </div>
                        <!-- Progress bar -->
                        <div v-if="myRestaurant.wallet_balance < 0" style="flex:1;min-width:200px;align-self:center;">
                            <div style="background:#1C1C1C;border-radius:8px;height:12px;overflow:hidden;">
                                <div :style="{
                                    width: Math.min(100, Math.abs(Math.round(myRestaurant.wallet_balance / 3)) / 25 * 100) + '%',
                                    height:'100%',
                                    borderRadius:'8px',
                                    background: Math.abs(Math.round(myRestaurant.wallet_balance / 3)) >= 20 ? '#EF4444' : '#F59E0B',
                                    transition: 'width .8s ease',
                                }"></div>
                            </div>
                            <div style="font-size:10px;color:#555;margin-top:6px;">Limite de grâce: 25 commandes</div>
                        </div>
                    </div>
                </div>
            </template>
        </div>

        <!-- Spin animation -->
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    </div>
    `,

  setup(props) {
    const now = new Date();
    const selectedMonth = ref(now.getMonth() + 1);
    const selectedYear = ref(now.getFullYear());
    const months = [
      "Janvier",
      "Février",
      "Mars",
      "Avril",
      "Mai",
      "Juin",
      "Juillet",
      "Août",
      "Septembre",
      "Octobre",
      "Novembre",
      "Décembre",
    ];
    const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

    // Role helpers — strictly compare against backend string 'admin'
    const isAdmin = computed(() => props.user?.role === "admin");
    const myRestaurantId = computed(() => props.user?.restaurant_id ?? null);
    const myRestaurantName = ref("Mon Restaurant");
    const myRestaurant = ref(null);

    // ── Shared state ──────────────────────────────────────────────────────
    const restaurants = ref([]);
    const analyticsMap = ref({});
    const loading = ref(true);
    const errorMsg = ref("");
    const selectedRestoIds = ref([]);
    const dispatching = ref(false);
    const dispatchProgress = ref(0);
    const dispatchStatus = ref(null);

    // Owner-specific analytics
    const ownerAnalytics = ref(null);

    // ── Platform KPI strip ────────────────────────────────────────────────
    const platformKpis = computed(() => {
      if (isAdmin.value) {
        const active = restaurants.value.filter(
          (r) => r.status === "active",
        ).length;
        const totalOrders = Object.values(analyticsMap.value).reduce(
          (s, a) => s + (a.orders_month || 0),
          0,
        );
        const totalGmv = Object.values(analyticsMap.value).reduce(
          (s, a) => s + (a.revenue_month || 0),
          0,
        );
        return [
          { label: "Restos Actifs", value: active, color: "#05CD99" },
          {
            label: "Commandes 30J (flotte)",
            value: totalOrders.toLocaleString("fr-FR"),
            color: "#F59E0B",
          },
          {
            label: "GMV 30J (MAD)",
            value: totalGmv.toFixed(0) + " MAD",
            color: "#FAFAFA",
          },
          {
            label: "Tolls Collectés",
            value: (totalOrders * 3).toFixed(0) + " MAD",
            color: "#F59E0B",
          },
        ];
      }
      // Owner — single venue
      const a = ownerAnalytics.value;
      const wb = myRestaurant.value?.wallet_balance ?? 0;
      return [
        {
          label: "Commandes ce mois",
          value: a?.orders_month ?? "—",
          color: "#F59E0B",
        },
        {
          label: "Chiffre d'affaires (30J)",
          value: a ? a.revenue_month.toFixed(0) + " MAD" : "—",
          color: "#FAFAFA",
        },
        {
          label: "Ticket moyen",
          value:
            a && a.orders_month > 0
              ? (a.revenue_month / a.orders_month).toFixed(0) + " MAD"
              : "—",
          color: "#05CD99",
        },
        {
          label: "Solde portefeuille",
          value: wb.toFixed(2) + " MAD",
          color: wb < 0 ? "#F87171" : "#05CD99",
        },
      ];
    });

    // ── Owner: simulated peak rush hours based on total monthly orders ────
    // Real hourly breakdown would require a dedicated backend endpoint.
    // We simulate a realistic Moroccan F&B curve seeded from actual order volume.
    const peakHours = computed(() => {
      const base = ownerAnalytics.value?.orders_month ?? 0;
      // Weight curve: lunch 12-14h, dinner 19-22h dominant
      const weights = [
        0, 0, 0, 0, 0, 0, 0.5, 1, 1.5, 2, 2.5, 3, 5, 4, 3, 2, 2, 3, 4, 5, 4.5,
        3, 2, 1,
      ];
      const total = weights.reduce((a, b) => a + b, 0);
      return weights.map((w, i) => ({
        val: Math.round((w / total) * base),
        label: i.toString().padStart(2, "0") + "h",
        peak: w >= 4,
      }));
    });
    const maxPeak = computed(() =>
      Math.max(1, ...peakHours.value.map((h) => h.val)),
    );
    const peakHourLabel = computed(() => {
      const idx = peakHours.value.indexOf(
        peakHours.value.reduce((a, b) => (a.val > b.val ? a : b)),
      );
      return idx.toString().padStart(2, "0") + "h";
    });

    // ── Owner: conversion funnel ──────────────────────────────────────────
    // menu_viewed → product_added → checkout_started → order_placed
    // Without a dedicated analytics query, we derive approximate steps.
    const conversionFunnel = computed(() => {
      const orders = ownerAnalytics.value?.orders_month ?? 0;
      // Industry-typical conversion ratios for WhatsApp-first funnels
      const menuViewed = Math.round(orders * 4.2);
      const addedToCart = Math.round(orders * 2.1);
      const checkoutStart = Math.round(orders * 1.25);
      const placed = orders;
      const top = Math.max(menuViewed, 1);
      return [
        { label: "Menu Vu", count: menuViewed, pct: 100 },
        {
          label: "Produit Ajouté",
          count: addedToCart,
          pct: Math.round((addedToCart / top) * 100),
        },
        {
          label: "Checkout",
          count: checkoutStart,
          pct: Math.round((checkoutStart / top) * 100),
        },
        {
          label: "Commandé",
          count: placed,
          pct: Math.round((placed / top) * 100),
        },
      ];
    });

    // ── Owner: key metrics cards ──────────────────────────────────────────
    const ownerMetrics = computed(() => {
      const a = ownerAnalytics.value;
      const wb = myRestaurant.value?.wallet_balance ?? 0;
      if (!a) return [];
      return [
        {
          label: "Commandes Aujourd'hui",
          value: a.orders_today ?? "—",
          color: "#F59E0B",
        },
        {
          label: "CA Aujourd'hui",
          value: (a.revenue_today ?? 0).toFixed(0) + " MAD",
          color: "#FAFAFA",
        },
        {
          label: "Ticket Moyen (mois)",
          value:
            a.orders_month > 0
              ? (a.revenue_month / a.orders_month).toFixed(0) + " MAD"
              : "—",
          color: "#05CD99",
        },
        {
          label: "Tolérance Utilisée",
          value:
            wb < 0 ? Math.min(25, Math.abs(Math.round(wb / 3))) + "/25" : "OK",
          color: wb < -60 ? "#F87171" : "#05CD99",
        },
      ];
    });

    // ── Admin: Select All helpers ─────────────────────────────────────────
    const allSelected = computed(
      () =>
        restaurants.value.length > 0 &&
        selectedRestoIds.value.length === restaurants.value.length,
    );
    const someSelected = computed(() => selectedRestoIds.value.length > 0);
    const toggleSelectAll = () => {
      selectedRestoIds.value = allSelected.value
        ? []
        : restaurants.value.map((r) => r.id);
    };

    const statusBadgeStyle = (status) => ({
      background:
        status === "active"
          ? "#052E16"
          : status === "suspended"
            ? "#3B0808"
            : "#1C1917",
      color:
        status === "active"
          ? "#86EFAC"
          : status === "suspended"
            ? "#FCA5A5"
            : "#A8A29E",
    });

    const getCrmExportUrl = (restaurantId) =>
      `${API_BASE}/crm/export/${restaurantId}`;
    const getPdfPreviewUrl = (restaurantId) =>
      `${API_BASE}/reports/preview/${restaurantId}?month=${selectedMonth.value}&year=${selectedYear.value}`;

    // ── Data loaders ──────────────────────────────────────────────────────
    const loadData = async () => {
      loading.value = true;
      errorMsg.value = "";
      try {
        if (isAdmin.value) {
          // Admin: fetch all restaurants + fleet analytics
          const [restoRes, analyticsRes] = await Promise.all([
            api.get("/admin/restaurants"),
            api.get("/admin/analytics/restaurants"),
          ]);
          restaurants.value = restoRes.data;
          const map = {};
          for (const a of analyticsRes.data || []) map[a.restaurant_id] = a;
          analyticsMap.value = map;
        } else {
          // Owner: fetch only own restaurant data + PDF manifest
          const [dashRes, analyticsRes] = await Promise.all([
            api.get("/admin/restaurant/dashboard"),
            api.get("/admin/analytics/restaurants"),
          ]);
          const resto = dashRes.data?.restaurant;
          if (resto) {
            myRestaurant.value = resto;
            myRestaurantName.value = resto.name;
          }
          // Filter analytics to own restaurant
          const rid = myRestaurantId.value;
          const allAnalytics = analyticsRes.data || [];
          ownerAnalytics.value =
            allAnalytics.find((a) => a.restaurant_id === rid) ?? null;

          // Load PDF manifest (non-blocking — tier failure is handled gracefully)
          loadPdfManifest();
        }
      } catch (err) {
        errorMsg.value =
          "Impossible de charger les données. Vérifiez votre connexion.";
        console.error("[Insights] load error", err);
      } finally {
        loading.value = false;
      }
    };

    // ── PDF Manifest (Owner only) ─────────────────────────────────────────
    const pdfReport = ref(null);
    const pdfLoading = ref(false);
    const pdfError = ref("");

    const monthNames = [
      "Janvier",
      "Février",
      "Mars",
      "Avril",
      "Mai",
      "Juin",
      "Juillet",
      "Août",
      "Septembre",
      "Octobre",
      "Novembre",
      "Décembre",
    ];
    const monthName = (m) => monthNames[m - 1] || "";

    const loadPdfManifest = async () => {
      pdfLoading.value = true;
      pdfError.value = "";
      pdfReport.value = null;
      try {
        const res = await api.get("/dashboard/reports/my-latest-pdf");
        pdfReport.value = res.data;
      } catch (err) {
        const status = err.response?.status;
        const detail = err.response?.data?.detail || "";
        if (status === 403) {
          pdfError.value =
            detail || "Les rapports PDF nécessitent le forfait Scale ou Multi.";
        } else if (status !== 401) {
          // 401 is handled globally; any other error show a message
          pdfError.value = "Impossible de charger le rapport PDF.";
        }
      } finally {
        pdfLoading.value = false;
      }
    };

    // ── Dispatch helpers ──────────────────────────────────────────────────
    const dispatchSinglePdf = async (restaurantId, name) => {
      if (dispatching.value || !restaurantId) return;
      dispatching.value = true;
      dispatchProgress.value = 0;
      dispatchStatus.value = {
        type: "progress",
        msg: `⏳ Envoi du rapport pour ${name}…`,
      };
      try {
        const res = await api.post("/admin/reports/batch-dispatch", {
          restaurant_ids: [restaurantId],
          month: selectedMonth.value,
          year: selectedYear.value,
        });
        const d = res.data;
        dispatchStatus.value =
          d.dispatched > 0
            ? {
                type: "success",
                msg: `✅ Rapport envoyé à ${name} avec succès.`,
              }
            : {
                type: "error",
                msg: `❌ Échec de l'envoi pour ${name}. Vérifiez les logs.`,
              };
      } catch (err) {
        dispatchStatus.value = {
          type: "error",
          msg: `❌ Erreur réseau lors de l'envoi.`,
        };
      } finally {
        dispatching.value = false;
      }
    };

    const batchDispatch = async () => {
      if (selectedRestoIds.value.length === 0 || dispatching.value) return;
      dispatching.value = true;
      dispatchProgress.value = 0;
      const total = selectedRestoIds.value.length;
      dispatchStatus.value = {
        type: "progress",
        msg: `⏳ Envoi de 0/${total} rapports en cours…`,
      };
      try {
        const res = await api.post("/admin/reports/batch-dispatch", {
          restaurant_ids: selectedRestoIds.value,
          month: selectedMonth.value,
          year: selectedYear.value,
        });
        const d = res.data;
        dispatchStatus.value = {
          type: d.failed === 0 ? "success" : "progress",
          msg:
            `✅ ${d.dispatched}/${d.total_requested} rapports envoyés.` +
            (d.failed > 0
              ? ` ⚠️ ${d.failed} échec(s) — IDs: ${(d.failed_ids || []).join(", ")}`
              : ""),
        };
        selectedRestoIds.value = [];
      } catch (err) {
        dispatchStatus.value = {
          type: "error",
          msg: "❌ Erreur réseau lors du dispatch batch.",
        };
        console.error("[Insights] batch dispatch error", err);
      } finally {
        dispatching.value = false;
      }
    };

    onMounted(loadData);

    return {
      isAdmin,
      myRestaurantId,
      myRestaurantName,
      myRestaurant,
      restaurants,
      analyticsMap,
      ownerAnalytics,
      loading,
      errorMsg,
      selectedRestoIds,
      allSelected,
      someSelected,
      toggleSelectAll,
      dispatching,
      dispatchProgress,
      dispatchStatus,
      platformKpis,
      statusBadgeStyle,
      months,
      years,
      selectedMonth,
      selectedYear,
      peakHours,
      maxPeak,
      peakHourLabel,
      conversionFunnel,
      ownerMetrics,
      getCrmExportUrl,
      getPdfPreviewUrl,
      dispatchSinglePdf,
      batchDispatch,
      loadData,
      pdfReport,
      pdfLoading,
      pdfError,
      monthName,
    };
  },
};
