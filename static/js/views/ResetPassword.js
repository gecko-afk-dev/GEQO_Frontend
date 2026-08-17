import {
  ref,
  onMounted,
  computed,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import { api } from "../api.js";

export default {
  template: `
        <div class="flex items-center justify-center min-h-screen animated-bg">
            <div class="glass p-8 rounded-2xl shadow-2xl w-full max-w-md card-hover">
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold text-slate-800 tracking-tight">{{ isSetup ? 'Set Your Password' : 'Reset Password' }}</h1>
                    <p class="text-slate-500 mt-2 text-sm">Please enter a new password for your account.</p>
                </div>
                <form v-if="!success" @submit.prevent="submit" class="space-y-5">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                        <input v-model="password" type="password" required class="input-premium" placeholder="••••••••">
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
                        <input v-model="confirmPassword" type="password" required class="input-premium" placeholder="••••••••">
                    </div>
                    <button type="submit" :disabled="loading || !isFormValid" class="w-full btn-primary mt-2 flex justify-center items-center disabled:opacity-50">
                        <span v-if="loading" class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                        <span>{{ loading ? 'Saving...' : 'Save Password' }}</span>
                    </button>
                    
                    <p v-if="password !== confirmPassword && confirmPassword" class="text-red-500 text-xs mt-2 text-center">Passwords do not match.</p>
                </form>
                
                <div v-else class="text-center">
                    <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <p class="text-slate-700 mb-6">Your password has been successfully saved!</p>
                    <button @click="$emit('done')" class="btn-primary w-full">Go to Login</button>
                </div>
                
                <div v-if="error" class="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 text-center">
                    {{ error }}
                </div>
            </div>
        </div>
    `,
  props: ["token", "isSetup"],
  emits: ["done"],
  setup(props, { emit }) {
    const password = ref("");
    const confirmPassword = ref("");
    const loading = ref(false);
    const error = ref(null);
    const success = ref(false);

    const rules = computed(() => ({
      hasMinLength: password.value.length >= 8,
      hasNumber: /\d/.test(password.value),
      hasUpper: /[A-Z]/.test(password.value),
      hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(password.value),
    }));

    const isPasswordStrong = computed(
      () =>
        rules.value.hasMinLength &&
        rules.value.hasNumber &&
        rules.value.hasUpper &&
        rules.value.hasSymbol,
    );

    const isFormValid = computed(
      () => isPasswordStrong.value && password.value === confirmPassword.value,
    );

    const submit = async () => {
      if (!isFormValid.value) return;
      loading.value = true;
      error.value = null;
      try {
        const endpoint = props.isSetup
          ? "/auth/setup-password"
          : "/auth/reset-password";
        await api.post(endpoint, {
          token: props.token,
          new_password: password.value,
        });
        success.value = true;
      } catch (err) {
        error.value =
          err.response?.data?.detail ||
          "Failed to set password. The link may be expired.";
      } finally {
        loading.value = false;
      }
    };

    return {
      password,
      confirmPassword,
      loading,
      error,
      success,
      submit,
      rules,
      isPasswordStrong,
      isFormValid,
    };
  },
};
