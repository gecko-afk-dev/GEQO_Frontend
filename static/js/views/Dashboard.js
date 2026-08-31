import { provide } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import KitchenMonitor from './KitchenMonitor.js';
import DesktopChrome from '../layouts/DesktopChrome.js';
import MobileAppShell from '../layouts/MobileAppShell.js';
import { useDeviceClass } from '../composables/useDeviceClass.js';
import { useDashboardShell } from '../composables/useDashboardShell.js';

export default {
  template: `
        <div v-if="user.role === 'kitchen_staff'" class="min-h-screen bg-slate-50 flex flex-col">
            <main class="flex-1 flex flex-col h-screen min-h-0 bg-[#0A0A0A] p-0 m-0">
                <KitchenMonitor :user="user" :lang="currentLang" :t="t" @logout="$emit('logout')"></KitchenMonitor>
            </main>
        </div>
        <DesktopChrome v-else-if="!isAppShell || user.role === 'admin'" :user="user" @logout="$emit('logout')"></DesktopChrome>
        <MobileAppShell v-else :user="user" @logout="$emit('logout')"></MobileAppShell>
    `,
  components: {
    KitchenMonitor,
    DesktopChrome,
    MobileAppShell,
  },
  props: {
    user: Object,
  },
  emits: ['logout'],
  setup(props) {
    const { isAppShell } = useDeviceClass();
    const shell = useDashboardShell(props.user);

    provide('t', shell.t);
    provide('currentLang', shell.currentLang);
    provide('dashboardShell', shell);

    return {
      isAppShell,
      currentLang: shell.currentLang,
      t: shell.t,
    };
  },
};
