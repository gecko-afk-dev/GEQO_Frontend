import { ref } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { api } from '../api.js';

export default {
    template: `
        <div class="flex items-center justify-center min-h-screen animated-bg">
            <div class="glass p-8 rounded-2xl shadow-2xl w-full max-w-md card-hover">
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold text-slate-800 tracking-tight">GEQO Portal</h1>
                    <p class="text-slate-500 mt-2 text-sm">{{ showForgot ? 'Reset your password' : 'Sign in to manage your orders' }}</p>
                </div>
                
                <form v-if="!showForgot" @submit.prevent="login" class="space-y-5">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input v-model="email" type="email" required class="input-premium" placeholder="name@restaurant.com">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <div class="relative">
                            <input v-model="password" :type="showPassword ? 'text' : 'password'"
                                   id="login-password"
                                   required class="input-premium pr-10" placeholder="••••••••">
                            <button type="button"
                                    @click="showPassword = !showPassword"
                                    :aria-label="showPassword ? 'Hide password' : 'Show password'"
                                    class="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none">
                                <!-- Eye-slash (visible when password is shown) -->
                                <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7a9.77 9.77 0 012.168-4.168M6.53 6.53A9.956 9.956 0 0112 5c5 0 9 4 9 7a9.77 9.77 0 01-1.382 2.618M3 3l18 18" />
                                </svg>
                                <!-- Eye (visible when password is hidden) -->
                                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="flex justify-end">
                        <button type="button" @click="showForgot = true" class="text-sm text-blue-600 hover:text-blue-800 font-medium">Forgot password?</button>
                    </div>
                    <button type="submit" :disabled="loading" class="w-full btn-primary mt-2 flex justify-center items-center">
                        <span v-if="loading" class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                        <span>{{ loading ? 'Signing in...' : 'Sign In' }}</span>
                    </button>
                </form>

                <form v-else @submit.prevent="forgotPassword" class="space-y-5">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input v-model="email" type="email" required class="input-premium" placeholder="name@restaurant.com">
                    </div>
                    <button type="submit" :disabled="loading" class="w-full btn-primary flex justify-center items-center">
                        <span v-if="loading" class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                        <span>{{ loading ? 'Sending...' : 'Send Reset Link' }}</span>
                    </button>
                    <div class="text-center mt-4">
                        <button type="button" @click="showForgot = false" class="text-sm text-slate-500 hover:text-slate-800">Back to login</button>
                    </div>
                </form>
                
                <div v-if="msg" class="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm border border-emerald-100 flex items-center text-center">
                    {{ msg }}
                </div>
                <div v-if="error" class="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-center">
                    <svg class="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>
                    {{ error }}
                </div>
            </div>
        </div>
    `,
    emits: ['login'],
    setup(props, { emit }) {
        const email = ref('');
        const password = ref('');
        const loading = ref(false);
        const error = ref(null);
        const msg = ref(null);
        const showForgot = ref(false);
        const showPassword = ref(false);

        const login = async () => {
            loading.value = true;
            error.value = null;
            try {
                const response = await api.post('/admin/login', {
                    email: email.value,
                    password: password.value
                });
                const { access_token, user } = response.data;
                // Persist the token in localStorage so that:
                //   1. app.js checkAuth() can confirm the session is active.
                //   2. OrdersManager WebSocket can send the bearer subprotocol
                //      on cross-origin dev connections where the httpOnly cookie
                //      is blocked by SameSite rules.
                // NOTE: In production the backend sets access_token = null and
                // relies on the httpOnly cookie. When that happens we store the
                // string 'cookie' as a sentinel so checkAuth() still passes.
                localStorage.setItem('token', access_token || 'cookie');
                localStorage.setItem('user', JSON.stringify(user));
                emit('login', user);
            } catch (err) {
                error.value = err.response?.data?.detail || 'Login failed';
            } finally {
                loading.value = false;
            }
        };

        const forgotPassword = async () => {
            loading.value = true;
            error.value = null;
            msg.value = null;
            try {
                const res = await api.post('/auth/forgot-password', { email: email.value });
                msg.value = res.data.message;
            } catch (err) {
                error.value = err.response?.data?.detail || 'Failed to request reset';
            } finally {
                loading.value = false;
            }
        };

        return { email, password, loading, error, msg, showForgot, showPassword, login, forgotPassword };
    }
}
