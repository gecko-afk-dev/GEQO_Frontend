import { createApp, ref, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import Login from './views/Login.js';
import Dashboard from './views/Dashboard.js';
import ResetPassword from './views/ResetPassword.js';
import ForcePasswordChange from './views/ForcePasswordChange.js';
import { api } from './api.js';

createApp({
    components: { Login, Dashboard, ResetPassword, ForcePasswordChange },
    setup() {
        const user = ref(null);
        const loading = ref(true);
        const urlParams = new URLSearchParams(window.location.search);
        const resetToken = ref(urlParams.get('reset_token') || urlParams.get('setup_token'));
        const isSetup = ref(urlParams.has('setup_token'));

        const checkAuth = async () => {
            try {
                const res = await api.get('/admin/me');
                user.value = res.data;
                sessionStorage.setItem('geqo_user', JSON.stringify(res.data));
            } catch {
                user.value = null;
                sessionStorage.removeItem('geqo_user');
            } finally {
                loading.value = false;
            }
        };

        const handleLogin = (userData) => {
            user.value = userData;
        };

        const handleLogout = async () => {
            try {
                await api.post('/admin/logout');
            } catch (err) {
                console.warn('Logout request failed, clearing session anyway', err);
            }
            sessionStorage.removeItem('geqo_user');
            user.value = null;
            window.location.href = '/';
        };

        const handlePasswordResetDone = () => {
            // Remove token from URL and show login
            window.history.replaceState({}, document.title, window.location.pathname);
            resetToken.value = null;
        };

        const handleForcePasswordUpdated = () => {
            if (user.value) {
                user.value.requires_password_change = false;
            }
        };

        onMounted(() => {
            if (!resetToken.value) {
                checkAuth();
            } else {
                loading.value = false;
            }
        });

        return { user, loading, resetToken, isSetup, handleLogin, handleLogout, handlePasswordResetDone, handleForcePasswordUpdated };
    }
}).mount('#app');
