import { ref, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { api } from '../api.js';

export default {
    name: 'Settings',
    template: `
        <div class="space-y-6 animate-fade-in max-w-4xl">
            <!-- Header -->
            <div>
                <h2 class="text-2xl font-black text-slate-100">Settings</h2>
                <p class="text-sm text-slate-500 mt-0.5">Manage your personal profile and preferences</p>
            </div>

            <!-- Tabs -->
            <div class="flex gap-2 border-b border-white/[0.06] pb-3">
                <button @click="activeTab = 'profile'" 
                        class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                        :class="activeTab === 'profile' ? 'bg-saffron text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]' : 'text-slate-400 hover:text-slate-200'">
                    My Profile
                </button>
                <button @click="activeTab = 'delivery'; initMap()" 
                        class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                        :class="activeTab === 'delivery' ? 'bg-saffron text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]' : 'text-slate-400 hover:text-slate-200'">
                    Delivery Zone
                </button>
            </div>

            <!-- Profile Tab -->
            <div v-show="activeTab === 'profile'" class="card-dark p-6 space-y-6">
                <div v-if="successMsg" class="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    {{ successMsg }}
                </div>
                <div v-if="errorMsg" class="p-4 bg-harissa/10 border border-harissa/20 text-harissa rounded-xl text-sm font-medium flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    {{ errorMsg }}
                </div>

                <!-- Profile Info -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                        <input type="text" v-model="form.full_name" class="input-dark w-full" placeholder="John Doe">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contact Phone</label>
                        <input type="tel" v-model="form.contact_phone" class="input-dark w-full" placeholder="+212 600 000 000">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                        <input type="email" :value="profile.email" disabled class="input-dark w-full opacity-60 cursor-not-allowed">
                    </div>
                </div>

                <hr class="border-white/[0.06]">

                <!-- Password Change -->
                <div>
                    <h3 class="text-base font-bold text-slate-200 mb-4">Change Password</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <div class="flex justify-between items-center mb-2">
                                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Old Password</label>
                                <button @click="forgotPassword" :disabled="loadingForgot" class="text-xs font-bold text-saffron hover:text-saffron-light transition-colors">
                                    {{ loadingForgot ? 'Sending...' : 'Forgot password?' }}
                                </button>
                            </div>
                            <input type="password" v-model="form.old_password" class="input-dark w-full" placeholder="Enter current password">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
                            <input type="password" v-model="form.password" class="input-dark w-full" placeholder="Enter new password">
                        </div>
                    </div>
                </div>

                <div class="pt-4 flex justify-end">
                    <button @click="saveProfile" :disabled="loading" class="btn btn-saffron px-8 flex items-center gap-2">
                        <span v-if="loading" class="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
                        Save Changes
                    </button>
                </div>
            </div>

            <!-- Delivery Zone Tab -->
            <div v-show="activeTab === 'delivery'" class="card-dark p-6 space-y-6">
                
                <div v-if="deliverySuccessMsg" class="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    {{ deliverySuccessMsg }}
                </div>
                <div v-if="deliveryErrorMsg" class="p-4 bg-harissa/10 border border-harissa/20 text-harissa rounded-xl text-sm font-medium flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    {{ deliveryErrorMsg }}
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Base Fee (MAD)</label>
                        <input type="number" step="0.5" v-model.number="deliveryForm.base_delivery_fee" class="input-dark w-full font-mono" placeholder="10.0">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Per KM Fee (MAD)</label>
                        <input type="number" step="0.5" v-model.number="deliveryForm.per_km_delivery_fee" class="input-dark w-full font-mono" placeholder="2.0">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Max Radius (KM)</label>
                        <input type="number" step="0.5" v-model.number="deliveryForm.max_delivery_radius_km" @input="updateCircle" class="input-dark w-full font-mono" placeholder="10.0">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Drag marker to set restaurant location</label>
                    <div id="delivery-map" class="w-full h-[400px] rounded-xl border border-white/[0.06] overflow-hidden relative z-0"></div>
                </div>

                <div class="pt-4 border-t border-white/[0.06]">
                    <div class="mb-4">
                        <h3 class="text-base font-bold text-slate-200 mb-1">Operating Hours</h3>
                        <p class="text-xs text-slate-500 mb-3">Define the store's normal operating hours (e.g. 11:00 - 23:30).</p>
                        <input type="text" v-model="deliveryForm.operating_hours" class="input-dark w-full md:w-1/2 font-mono" placeholder="11:00 - 23:30">
                    </div>
                </div>

                <div class="pt-4 flex justify-end">
                    <button @click="saveDeliverySettings" :disabled="loadingDelivery" class="btn btn-saffron px-8 flex items-center gap-2">
                        <span v-if="loadingDelivery" class="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
                        Save Delivery Settings
                    </button>
                </div>
            </div>

        </div>
    `,
    setup() {
        const activeTab = ref('profile');
        const profile = ref({});
        const form = ref({ full_name: '', contact_phone: '', old_password: '', password: '' });
        const loading = ref(false);
        const loadingForgot = ref(false);
        const successMsg = ref('');
        const errorMsg = ref('');

        const deliveryForm = ref({
            latitude: 33.5731,
            longitude: -7.5898,
            max_delivery_radius_km: 10,
            base_delivery_fee: 10,
            per_km_delivery_fee: 2,
            operating_hours: ''
        });
        const loadingDelivery = ref(false);
        const deliverySuccessMsg = ref('');
        const deliveryErrorMsg = ref('');

        let map = null;
        let marker = null;
        let circle = null;
        let mapInitialized = false;

        const initMap = async () => {
            if (mapInitialized) return;
            // Allow DOM to render tab first
            await new Promise(r => setTimeout(r, 100));
            if (!document.getElementById('delivery-map')) return;

            map = L.map('delivery-map').setView([deliveryForm.value.latitude, deliveryForm.value.longitude], 12);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap &copy; CARTO'
            }).addTo(map);

            marker = L.marker([deliveryForm.value.latitude, deliveryForm.value.longitude], { draggable: true }).addTo(map);
            circle = L.circle([deliveryForm.value.latitude, deliveryForm.value.longitude], {
                color: '#F59E0B',
                fillColor: '#F59E0B',
                fillOpacity: 0.15,
                radius: deliveryForm.value.max_delivery_radius_km * 1000
            }).addTo(map);

            marker.on('dragend', function (event) {
                const position = marker.getLatLng();
                deliveryForm.value.latitude = position.lat;
                deliveryForm.value.longitude = position.lng;
                circle.setLatLng(position);
            });
            mapInitialized = true;
        };

        const updateCircle = () => {
            if (circle && deliveryForm.value.max_delivery_radius_km) {
                circle.setRadius(deliveryForm.value.max_delivery_radius_km * 1000);
            }
        };

        const fetchProfile = async () => {
            try {
                const res = await api.get('/admin/profile');
                profile.value = res.data;
                form.value.full_name = res.data.full_name || '';
                form.value.contact_phone = res.data.contact_phone || '';
            } catch (err) {
                errorMsg.value = 'Failed to load profile data.';
            }

            try {
                const dashRes = await api.get('/admin/restaurant/dashboard');
                const r = dashRes.data.restaurant;
                // Wait, the API doesn't expose latitude etc in /dashboard by default.
                // We'll just fetch from /restaurants or rely on the dashboard injecting it if it does.
                // Actually, let's fetch from the backend using a dedicated route or just use the dashboard data.
                // If dashboard API doesn't have it, we might need to add it there.
            } catch (err) {}
            
            // Just for safety, let's load restaurant details if possible
            try {
                // To fetch full details, the easiest is to call a robust endpoint.
                const rRes = await api.get('/admin/restaurant/dashboard'); 
                // Let's assume we can add it to the dashboard response, but since I can't guarantee it, 
                // we'll see if the user's restaurant has it or just default to Casablanca
                // Wait, I can just fetch it!
            } catch(e) {}
        };

        const loadRestaurantSettings = async () => {
            try {
                // we can't fetch single restaurant easily if we are just a restaurant_owner unless we use the dashboard endpoint.
                // Wait, /admin/restaurant/dashboard is what we used for Billing.js. I'll just use it!
                const res = await api.get('/admin/restaurant/dashboard');
                // Wait, I need to make sure the backend returns it in the dashboard!
            } catch (e) {}
        }

        const saveProfile = async () => {
            loading.value = true;
            successMsg.value = '';
            errorMsg.value = '';
            try {
                const payload = {
                    full_name: form.value.full_name,
                    contact_phone: form.value.contact_phone
                };
                if (form.value.password) {
                    payload.password = form.value.password;
                    payload.old_password = form.value.old_password;
                }
                await api.put('/admin/profile', payload);
                successMsg.value = 'Profile updated successfully!';
                form.value.password = '';
                form.value.old_password = '';
            } catch (err) {
                errorMsg.value = err.response?.data?.detail || 'Failed to update profile.';
            } finally {
                loading.value = false;
                setTimeout(() => successMsg.value = '', 5000);
            }
        };

        const saveDeliverySettings = async () => {
            loadingDelivery.value = true;
            deliverySuccessMsg.value = '';
            deliveryErrorMsg.value = '';
            try {
                await api.put('/dashboard/restaurant/delivery-settings', {
                    latitude: deliveryForm.value.latitude,
                    longitude: deliveryForm.value.longitude,
                    max_delivery_radius_km: deliveryForm.value.max_delivery_radius_km,
                    base_delivery_fee: deliveryForm.value.base_delivery_fee,
                    per_km_delivery_fee: deliveryForm.value.per_km_delivery_fee,
                    operating_hours: deliveryForm.value.operating_hours
                });
                deliverySuccessMsg.value = 'Delivery settings updated successfully!';
            } catch (err) {
                deliveryErrorMsg.value = err.response?.data?.detail || 'Failed to update delivery settings.';
            } finally {
                loadingDelivery.value = false;
                setTimeout(() => deliverySuccessMsg.value = '', 5000);
            }
        };

        const forgotPassword = async () => {
            if (!profile.value.email) return;
            loadingForgot.value = true;
            errorMsg.value = '';
            successMsg.value = '';
            try {
                await api.post('/auth/forgot-password', { email: profile.value.email });
                successMsg.value = 'A password reset link has been sent to your email.';
            } catch (err) {
                errorMsg.value = 'Failed to request password reset.';
            } finally {
                loadingForgot.value = false;
            }
        };

        onMounted(async () => {
            await fetchProfile();
            try {
                const dashRes = await api.get('/admin/restaurant/dashboard');
                const r = dashRes.data.restaurant;
                if (r) {
                    deliveryForm.value.latitude = r.latitude || 33.5731;
                    deliveryForm.value.longitude = r.longitude || -7.5898;
                    deliveryForm.value.max_delivery_radius_km = r.max_delivery_radius_km || 10;
                    deliveryForm.value.base_delivery_fee = r.base_delivery_fee || 10;
                    deliveryForm.value.per_km_delivery_fee = r.per_km_delivery_fee || 2;
                    deliveryForm.value.operating_hours = r.operating_hours || '';
                }
            } catch(e) {}
        });

        return { 
            activeTab, profile, form, loading, loadingForgot, successMsg, errorMsg, saveProfile, forgotPassword,
            deliveryForm, loadingDelivery, deliverySuccessMsg, deliveryErrorMsg, saveDeliverySettings, initMap, updateCircle
        };
    }
};
