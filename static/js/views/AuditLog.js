import { ref, onMounted, computed } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { api } from '../api.js';

export default {
    name: 'AuditLog',
    template: `
        <div class="space-y-6">
            <!-- Header section -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                    <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Security & Audit Trails</h2>
                    <p class="text-sm text-slate-500 mt-1">Platform operations log. Track status changes, staff updates, and menu adjustments.</p>
                </div>
                <button @click="fetchLogs(0)" class="inline-flex items-center px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-all duration-200 gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                    </svg>
                    Refresh Logs
                </button>
            </div>

            <!-- Timeline Card -->
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
                <div v-if="loading" class="flex flex-col items-center justify-center py-16">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span class="text-sm text-slate-500 mt-3 font-medium">Retrieving audit log history...</span>
                </div>

                <div v-else-if="logs.length === 0" class="flex flex-col items-center justify-center py-20 text-center px-4">
                    <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 class="text-lg font-bold text-slate-700">No logs recorded yet</h3>
                    <p class="text-sm text-slate-400 mt-1 max-w-sm">Operations logs will appear here once actions are performed on the dashboard.</p>
                </div>

                <div v-else class="relative border-l border-slate-200 ml-3 md:ml-4 space-y-8 pb-8">
                    <div v-for="log in logs" :key="log.id" class="relative pl-6 md:pl-8 group">
                        <!-- Timeline node -->
                        <span class="absolute -left-2 top-1.5 h-4 w-4 rounded-full border-2 border-white bg-slate-200 group-hover:bg-blue-500 group-hover:ring-4 group-hover:ring-blue-50 transition-all"></span>
                        
                        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <span :class="actionBadgeClass(log.action)" class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                        {{ formatAction(log.action) }}
                                    </span>
                                    <span class="text-sm font-medium text-slate-700">{{ log.actor_email }}</span>
                                </div>
                                <p class="text-slate-600 text-sm mt-1.5 leading-relaxed">
                                    {{ generateReadableDetail(log) }}
                                </p>
                                <p v-if="log.target" class="text-xs text-slate-400 font-mono mt-2">
                                    Target: {{ log.target }}
                                </p>
                            </div>
                            <div class="text-xs text-slate-500 font-medium whitespace-nowrap pt-1">
                                {{ formatTimestamp(log.created_at) }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Pagination footer -->
                <div v-if="logs.length > 0 || offset > 0" class="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <span class="text-xs font-medium text-slate-500">
                        Showing page {{ currentPage }} ({{ logs.length }} logs)
                    </span>
                    <div class="flex gap-2">
                        <button @click="prevPage" :disabled="offset === 0" class="px-3.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                            Previous
                        </button>
                        <button @click="nextPage" :disabled="logs.length < limit" class="px-3.5 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    \`,
    setup() {
        const logs = ref([]);
        const loading = ref(true);
        const limit = ref(50);
        const offset = ref(0);

        const fetchLogs = async (newOffset = 0) => {
            loading.value = true;
            try {
                const res = await api.get(\`/admin/audit-log?limit=\${limit.value}&offset=\${newOffset}\`);
                logs.value = res.data;
                offset.value = newOffset;
            } catch (err) {
                console.error(err);
            } finally {
                loading.value = false;
            }
        };

        const formatTimestamp = (isoString) => {
            if (!isoString) return '-';
            const date = new Date(isoString);
            return date.toLocaleString();
        };

        const formatAction = (action) => {
            return action.replace(/_/g, ' ');
        };

        const actionBadgeClass = (action) => {
            if (action.includes('STAFF_INVITED') || action.includes('INVITE')) {
                return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
            }
            if (action.includes('ORDER')) {
                return 'bg-blue-50 text-blue-700 border border-blue-200';
            }
            if (action.includes('TOGGLE') || action.includes('STATUS')) {
                return 'bg-amber-50 text-amber-700 border border-amber-200';
            }
            if (action.includes('REMOVED') || action.includes('DELETE') || action.includes('SUSPEND') || action.includes('DEBIT')) {
                return 'bg-rose-50 text-rose-700 border border-rose-200';
            }
            if (action.includes('BILLING') || action.includes('CREDIT')) {
                return 'bg-purple-50 text-purple-700 border border-purple-200';
            }
            return 'bg-slate-100 text-slate-700 border border-slate-200';
        };

        const generateReadableDetail = (log) => {
            if (!log.detail) return 'Action performed without additional details.';
            
            // Legacy strings wrapped in {"message": ...}
            if (log.detail.message) {
                return log.detail.message;
            }

            switch(log.action) {
                case 'ORDER_STATUS_UPDATED':
                    return `Updated order from '${log.detail.old}' to '${log.detail.new}'`;
                case 'ITEM_AVAILABILITY_TOGGLED':
                    const status = log.detail.is_available ? 'Available' : 'Out of Stock';
                    return `Marked menu item '${log.detail.item_name}' as ${status}`;
                case 'BILLING_ADJUSTED':
                    return `Adjusted wallet balance by ${log.detail.amount > 0 ? '+' : ''}${log.detail.amount} MAD (${log.detail.type}). Reason: ${log.detail.description}`;
                default:
                    // Fallback for unknown JSON structures
                    return JSON.stringify(log.detail);
            }
        };

        const currentPage = computed(() => {
            return Math.floor(offset.value / limit.value) + 1;
        });

        const nextPage = () => {
            fetchLogs(offset.value + limit.value);
        };

        const prevPage = () => {
            fetchLogs(Math.max(0, offset.value - limit.value));
        };

        onMounted(() => {
            fetchLogs(0);
        });

        return {
            logs,
            loading,
            limit,
            offset,
            currentPage,
            fetchLogs,
            formatTimestamp,
            formatAction,
            actionBadgeClass,
            generateReadableDetail,
            nextPage,
            prevPage
        };
    }
};
