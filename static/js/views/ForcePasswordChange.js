import { ref, computed } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { api } from '../api.js';

export default {
    template: `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
            <div class="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    </div>
                    <h2 class="text-2xl font-bold text-slate-800">Security Update Required</h2>
                    <p class="text-slate-500 mt-2 text-sm">Please update your temporary password to continue to the dashboard.</p>
                </div>
                
                <form @submit.prevent="submit" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                        <input v-model="password" type="password" required class="input-premium border-slate-300" id="force-new-password">

                        <!-- Password Strength Meter (4 rules) -->
                        <div class="mt-3 space-y-1.5">
                            <div :style="rules.hasMinLength ? 'color:#05CD99;font-weight:700;' : 'color:#9ca3af;'"
                                 class="flex items-center gap-2 text-xs transition-all duration-200">
                                <span>{{ rules.hasMinLength ? '✓' : '○' }}</span>
                                <span>Au moins 8 caractères</span>
                            </div>
                            <div :style="rules.hasNumber ? 'color:#05CD99;font-weight:700;' : 'color:#9ca3af;'"
                                 class="flex items-center gap-2 text-xs transition-all duration-200">
                                <span>{{ rules.hasNumber ? '✓' : '○' }}</span>
                                <span>Au moins 1 chiffre</span>
                            </div>
                            <div :style="rules.hasUpper ? 'color:#05CD99;font-weight:700;' : 'color:#9ca3af;'"
                                 class="flex items-center gap-2 text-xs transition-all duration-200">
                                <span>{{ rules.hasUpper ? '✓' : '○' }}</span>
                                <span>Au moins 1 majuscule</span>
                            </div>
                            <div :style="rules.hasSymbol ? 'color:#05CD99;font-weight:700;' : 'color:#9ca3af;'"
                                 class="flex items-center gap-2 text-xs transition-all duration-200">
                                <span>{{ rules.hasSymbol ? '✓' : '○' }}</span>
                                <span>Au moins 1 symbole (!@#$%...)</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                        <input v-model="confirmPassword" type="password" required class="input-premium border-slate-300" id="force-confirm-password">
                    </div>
                    
                    <button type="submit"
                            :disabled="loading || !isFormValid"
                            class="w-full btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                        <span v-if="loading" class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                        {{ loading ? 'Saving...' : 'Update Password & Continue' }}
                    </button>
                    <p v-if="password !== confirmPassword && confirmPassword" class="text-red-500 text-xs mt-2 text-center">Passwords do not match.</p>
                    <div v-if="error" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 text-center">{{ error }}</div>
                </form>
            </div>
        </div>
    `,
    props: ['user'],
    emits: ['updated'],
    setup(props, { emit }) {
        const password = ref('');
        const confirmPassword = ref('');
        const loading = ref(false);
        const error = ref(null);

        const rules = computed(() => ({
            hasMinLength: password.value.length >= 8,
            hasNumber:    /\d/.test(password.value),
            hasUpper:     /[A-Z]/.test(password.value),
            hasSymbol:    /[!@#$%^&*(),.?":{}|<>]/.test(password.value),
        }));

        const isPasswordStrong = computed(() =>
            rules.value.hasMinLength &&
            rules.value.hasNumber &&
            rules.value.hasUpper &&
            rules.value.hasSymbol
        );

        const isFormValid = computed(() =>
            isPasswordStrong.value &&
            password.value === confirmPassword.value
        );

        const submit = async () => {
            if (!isFormValid.value) return;
            loading.value = true;
            error.value = null;
            try {
                await api.post('/auth/force-change-password', { new_password: password.value });
                emit('updated');
            } catch (err) {
                error.value = err.response?.data?.detail || 'Failed to update password. Please try again.';
            } finally {
                loading.value = false;
            }
        };

        return { password, confirmPassword, loading, error, rules, isPasswordStrong, isFormValid, submit };
    }
}
