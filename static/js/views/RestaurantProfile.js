import { ref, computed } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
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
                            {{ restaurant.status === 'active' ? '● Active' : '✕ Suspended' }}
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
                            <p class="text-sm text-slate-300">{{ restaurant.city || '—' }}</p>
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
                    <button @click="$emit('adjust-wallet', restaurant)" class="btn btn-saffron font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]">
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
                    🍔 Menu Management
                </button>
                <button @click="activeTab = 'agents'" 
                        class="px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap"
                        :class="activeTab === 'agents' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-500 hover:text-slate-300'">
                    🛵 Delivery Agents
                </button>
                <button @click="activeTab = 'settings'" 
                        class="px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap"
                        :class="activeTab === 'settings' ? 'border-berry text-berry' : 'border-transparent text-slate-500 hover:text-slate-300'">
                    📍 Geo-Fencing
                </button>
                <button @click="activeTab = 'audit'" 
                        class="px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap"
                        :class="activeTab === 'audit' ? 'border-emerald text-emerald' : 'border-transparent text-slate-500 hover:text-slate-300'">
                    📜 Audit Logs
                </button>
            </div>
            
            <!-- ════ TAB CONTENT ════ -->
            <div class="pt-6 min-h-[500px]">
                <keep-alive>
                    <component :is="activeTabComponent" :user="mockedUser"></component>
                </keep-alive>
            </div>
            
        </div>
    `,
    setup(props) {
        const activeTab = ref('menu');
        
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
                // Ensure they have 'restaurant_owner' level permission for these views if needed,
                // or just keep 'admin' but the injected restaurant_id is the key mechanism.
                role: 'restaurant_owner' // Trick components that might check role === 'restaurant_owner'
            };
        });
        
        return { activeTab, activeTabComponent, mockedUser };
    }
};
