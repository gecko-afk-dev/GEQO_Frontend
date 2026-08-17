import {
  ref,
  computed,
  onMounted,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { api } from "../api.js";

export default {
  name: "DriversManager",
  props: ["user"],
  template: `
        <div class="space-y-6" style="font-family:'Plus Jakarta Sans',sans-serif;">

            <!-- ── Page Header ── -->
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-lg font-black tracking-widest uppercase text-neutral-800">Delivery Agents</h2>
                    <p class="text-xs text-neutral-500 mt-0.5 font-mono">Daily summary — {{ summaryDate || 'Today' }}</p>
                </div>
                <button @click="refreshAll"
                        :disabled="loadingDay"
                        class="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-40">
                    <span v-if="loadingDay" class="animate-spin h-3.5 w-3.5 border border-white border-t-transparent rounded-full"></span>
                    <span v-else>↻</span>
                    Refresh
                </button>
            </div>

            <!-- ── Top Summary Strip ── -->
            <div class="grid grid-cols-2 gap-4 bg-[#141414] border border-neutral-800 p-6 rounded-xl">
                <div>
                    <div class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Total Livraisons Aujourd'hui</div>
                    <div class="text-3xl font-black text-white">{{ totalDeliveries }}</div>
                </div>
                <div>
                    <div class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Total Cash Encaissé</div>
                    <div class="text-3xl font-black" style="color:#F59E0B;">{{ totalCash.toFixed(2) }} <span class="text-base font-semibold">MAD</span></div>
                </div>
            </div>

            <!-- ── Error Banner ── -->
            <div v-if="dayError" class="p-4 bg-red-950 border border-red-800 rounded-xl text-red-400 text-sm font-medium">
                ⚠️ {{ dayError }}
            </div>

            <!-- ── Loading Skeleton ── -->
            <div v-if="loadingDay && !dayError" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div v-for="i in 2" :key="i" class="bg-[#141414] border border-neutral-800 rounded-xl p-6 animate-pulse">
                    <div class="h-4 bg-neutral-800 rounded w-1/2 mb-3"></div>
                    <div class="h-8 bg-neutral-800 rounded w-1/3 mb-2"></div>
                    <div class="h-3 bg-neutral-800 rounded w-2/3"></div>
                </div>
            </div>

            <!-- ── Driver Cards Grid ── -->
            <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div v-for="d in driverSummary" :key="d.driver_id"
                     class="bg-[#141414] border border-neutral-800 rounded-xl overflow-hidden transition-all">

                    <!-- Driver Card Header -->
                    <div class="flex items-start justify-between p-5 border-b border-neutral-800">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-base font-black text-white truncate">{{ d.driver_name }}</span>
                                <span v-if="d.is_active"
                                      class="px-2 py-0.5 text-[10px] font-bold rounded-full"
                                      style="background:#052E16;color:#05CD99;border:1px solid #166534;">🟢 Actif</span>
                                <span v-else
                                      class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-neutral-800 text-neutral-500">⚫ Inactif</span>
                            </div>
                            <div v-if="d.driver_phone" class="text-xs text-neutral-500 font-mono">{{ d.driver_phone }}</div>
                        </div>
                        <div class="text-right ml-4">
                            <div class="text-2xl font-black text-white">{{ d.deliveries_count }}</div>
                            <div class="text-[10px] text-neutral-500 uppercase tracking-wider">livraisons</div>
                        </div>
                    </div>

                    <!-- Cash collected + expand toggle -->
                    <div class="flex items-center justify-between px-5 py-3">
                        <div>
                            <div class="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Cash Encaissé</div>
                            <div class="text-xl font-black" style="color:#F59E0B;">
                                {{ d.cash_collected.toLocaleString('fr-FR', {minimumFractionDigits:0}) }} <span class="text-sm font-medium text-neutral-400">DH</span>
                            </div>
                        </div>
                        <button v-if="d.orders.length > 0"
                                @click="toggleExpand(d.driver_id)"
                                class="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-lg transition-colors">
                            {{ expandedDrivers.includes(d.driver_id) ? '▲ Masquer' : '▼ ' + d.orders.length + ' commandes' }}
                        </button>
                        <div v-else class="text-xs text-neutral-600 font-mono italic">Aucune livraison</div>
                    </div>

                    <!-- Collapsible Orders Table -->
                    <div v-if="expandedDrivers.includes(d.driver_id) && d.orders.length > 0"
                         class="border-t border-neutral-800 overflow-x-auto">
                        <table class="w-full text-xs">
                            <thead class="bg-neutral-900">
                                <tr>
                                    <th class="px-4 py-2.5 text-left font-bold text-neutral-500 uppercase tracking-wider">Ticket</th>
                                    <th class="px-4 py-2.5 text-left font-bold text-neutral-500 uppercase tracking-wider">Client</th>
                                    <th class="px-4 py-2.5 text-right font-bold text-neutral-500 uppercase tracking-wider">Total</th>
                                    <th class="px-4 py-2.5 text-right font-bold text-neutral-500 uppercase tracking-wider">Heure</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-neutral-800">
                                <tr v-for="o in d.orders" :key="o.id"
                                    class="hover:bg-neutral-800/50 transition-colors">
                                    <td class="px-4 py-2.5 font-mono font-bold text-amber-400">#{{ o.tracking_code || o.id }}</td>
                                    <td class="px-4 py-2.5 text-neutral-300 truncate max-w-[120px]">{{ o.customer_name || '—' }}</td>
                                    <td class="px-4 py-2.5 text-right font-bold text-white">{{ o.total_amount.toFixed(2) }} MAD</td>
                                    <td class="px-4 py-2.5 text-right text-neutral-500 font-mono">{{ formatTime(o.delivered_at) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Empty state -->
                <div v-if="!loadingDay && driverSummary.length === 0 && !dayError"
                     class="lg:col-span-2 bg-[#141414] border border-neutral-800 rounded-xl p-12 text-center">
                    <div class="text-4xl mb-3">🛵</div>
                    <div class="text-neutral-400 font-bold">Aucune livraison complétée aujourd'hui</div>
                    <div class="text-neutral-600 text-xs mt-1">Les livraisons apparaîtront ici une fois marquées comme livrées.</div>
                </div>
            </div>

            <!-- ── Driver Management Panel (Owner / Admin only) ── -->
            <div v-if="user && ['restaurant_owner', 'admin'].includes(user.role)"
                 class="border-t border-neutral-200 pt-6">
                <h3 class="text-sm font-bold text-neutral-700 uppercase tracking-widest mb-4">Gestion des Agents</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

                    <!-- Add Form -->
                    <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                        <h4 class="text-sm font-bold text-slate-700 mb-4">Ajouter un Agent</h4>
                        <form @submit.prevent="addDriver" class="space-y-3">
                            <div>
                                <label class="block text-xs font-medium text-slate-600 mb-1">Nom</label>
                                <input v-model="newDriver.name" type="text" required class="input-premium" placeholder="ex: Youssef B.">
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-slate-600 mb-1">WhatsApp (212…)</label>
                                <input v-model="newDriver.wa_id" type="text" required class="input-premium" placeholder="ex: 212612345678">
                            </div>
                            <button type="submit" :disabled="adding" class="w-full btn-primary text-sm py-2 mt-1">
                                {{ adding ? 'Ajout...' : 'Ajouter' }}
                            </button>
                        </form>
                    </div>

                    <!-- Drivers List -->
                    <div class="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div v-if="loadingDrivers" class="p-8 text-center text-slate-400 text-sm animate-pulse">Chargement...</div>
                        <table v-else class="min-w-full divide-y divide-slate-200 text-sm">
                            <thead class="bg-slate-50">
                                <tr>
                                    <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nom</th>
                                    <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">WhatsApp</th>
                                    <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                                    <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr v-for="d in driversList" :key="d.id" class="hover:bg-slate-50">
                                    <td class="px-5 py-3 font-medium text-slate-900">{{ d.name }}</td>
                                    <td class="px-5 py-3 text-slate-500 font-mono text-xs">{{ d.wa_id }}</td>
                                    <td class="px-5 py-3">
                                        <span :class="d.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'"
                                              class="px-2.5 py-0.5 text-xs font-bold rounded-full">
                                            {{ d.is_active ? 'Actif' : 'Inactif' }}
                                        </span>
                                    </td>
                                    <td class="px-5 py-3">
                                        <button @click="deleteDriver(d.id)" class="text-red-500 hover:text-red-700 text-xs font-bold">Supprimer</button>
                                    </td>
                                </tr>
                                <tr v-if="driversList.length === 0">
                                    <td colspan="4" class="px-5 py-8 text-center text-slate-400">Aucun agent enregistré.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    `,
  setup(props) {
    // ── Daily summary state ──
    const summaryDate = ref(null);
    const totalDeliveries = ref(0);
    const totalCash = ref(0);
    const driverSummary = ref([]);
    const loadingDay = ref(true);
    const dayError = ref(null);
    const expandedDrivers = ref([]);

    // ── Driver CRUD state ──
    const driversList = ref([]);
    const loadingDrivers = ref(true);
    const adding = ref(false);
    const newDriver = ref({ name: "", wa_id: "" });

    const toggleExpand = (driverId) => {
      const idx = expandedDrivers.value.indexOf(driverId);
      if (idx === -1) expandedDrivers.value.push(driverId);
      else expandedDrivers.value.splice(idx, 1);
    };

    const formatTime = (isoStr) => {
      if (!isoStr) return "—";
      try {
        const d = new Date(isoStr);
        return d.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return "—";
      }
    };

    const loadDailySummary = async () => {
      if (!props.user?.restaurant_id && props.user?.role !== "admin") return;
      const restaurantId = props.user?.restaurant_id;
      if (!restaurantId) return;

      loadingDay.value = true;
      dayError.value = null;
      try {
        const res = await api.get(
          `/dashboard/deliveries/daily-summary/${restaurantId}`,
        );
        const data = res.data;
        summaryDate.value = data.date;
        totalDeliveries.value = data.total_deliveries_today;
        totalCash.value = data.total_cash_collected_today;
        driverSummary.value = data.drivers;
      } catch (err) {
        const status = err.response?.status;
        const detail = err.response?.data?.detail;
        if (status === 403) {
          dayError.value =
            "Permission refusée pour accéder au résumé des livraisons.";
        } else {
          dayError.value =
            detail || "Impossible de charger le résumé des livraisons.";
        }
        console.error("[DriversManager] daily summary error:", err);
      } finally {
        loadingDay.value = false;
      }
    };

    const loadDriversList = async () => {
      loadingDrivers.value = true;
      try {
        const res = await api.get("/admin/drivers");
        driversList.value = res.data;
      } catch (err) {
        console.error("[DriversManager] list error:", err);
      } finally {
        loadingDrivers.value = false;
      }
    };

    const addDriver = async () => {
      adding.value = true;
      try {
        await api.post("/admin/drivers", newDriver.value);
        newDriver.value = { name: "", wa_id: "" };
        await loadDriversList();
        await loadDailySummary(); // refresh summary too
      } catch (err) {
        const detail =
          err.response?.data?.detail || "Échec de l'ajout du livreur.";
        alert(detail);
        console.error("[DriversManager] add error:", err);
      } finally {
        adding.value = false;
      }
    };

    const deleteDriver = async (id) => {
      if (!confirm("Supprimer cet agent définitivement ?")) return;
      try {
        await api.delete("/admin/drivers/" + id);
        await loadDriversList();
      } catch (err) {
        const detail = err.response?.data?.detail || "Échec de la suppression.";
        alert(detail);
        console.error("[DriversManager] delete error:", err);
      }
    };

    const refreshAll = async () => {
      await Promise.all([loadDailySummary(), loadDriversList()]);
    };

    onMounted(() => {
      loadDailySummary();
      loadDriversList();
    });

    return {
      summaryDate,
      totalDeliveries,
      totalCash,
      driverSummary,
      loadingDay,
      dayError,
      expandedDrivers,
      driversList,
      loadingDrivers,
      adding,
      newDriver,
      toggleExpand,
      formatTime,
      addDriver,
      deleteDriver,
      refreshAll,
    };
  },
};
