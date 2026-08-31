import {
  ref,
  computed,
  onMounted,
  onUnmounted,
} from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { api } from '../api.js';

const translations = {
  en: {
    Overview: 'Overview',
    'Active Orders': 'Active Orders',
    'Restaurants Admin': 'Restaurants Admin',
    'Menu Management': 'Menu Management',
    'Staff Management': 'Staff Management',
    'Delivery Agents': 'Delivery Agents',
    Deliveries: 'Deliveries',
    'Audit Logs': 'Audit Logs',
    '💳 Billing': '💳 Billing',
    '📊 Insights & Rapports': '📊 Insights & Reports',
    'Sign Out': 'Sign Out',
  },
  fr: {
    Overview: 'Aperçu',
    'Active Orders': 'Commandes Actives',
    'Restaurants Admin': 'Admin Restaurants',
    'Menu Management': 'Gestion Menu',
    'Staff Management': 'Gestion Personnel',
    'Delivery Agents': 'Livreurs',
    Deliveries: 'Livraisons',
    'Audit Logs': 'Journaux d\'Audit',
    '💳 Billing': '💳 Facturation',
    '📊 Insights & Rapports': '📊 Insights & Rapports',
    'Sign Out': 'Déconnexion',
  },
  ar: {
    Overview: 'نظرة عامة',
    'Active Orders': 'الطلبات النشطة',
    'Restaurants Admin': 'إدارة المطاعم',
    'Menu Management': 'إدارة القائمة',
    'Staff Management': 'إدارة الموظفين',
    'Delivery Agents': 'عمال التوصيل',
    Deliveries: 'التوصيلات',
    'Audit Logs': 'سجلات التدقيق',
    '💳 Billing': '💳 الفواتير',
    '📊 Insights & Rapports': '📊 التقارير',
    'Sign Out': 'تسجيل الخروج',
  },
};

export function useDashboardShell(user) {
  const defaultView = user.role === 'kitchen_staff' ? 'kitchen-monitor' : 'overview';
  const currentView = ref(defaultView);

  // Language Switcher (Trilingual)
  const currentLang = ref(localStorage.getItem('geqo_admin_lang') || 'fr');
  const setLanguage = (lang) => {
    currentLang.value = lang;
    localStorage.setItem('geqo_admin_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const t = (key) => {
    const lang = currentLang.value;
    if (translations[lang] && translations[lang][key]) {
      return translations[lang][key];
    }
    return key;
  };

  // Live wallet balance — fetched from API on mount, not from stale localStorage
  const liveWalletBalance = ref(user.wallet_balance || 0);
  const isAcceptingOrders = ref(user.is_accepting_orders ?? true);
  const isOpenBySchedule = ref(true); // Computed from backend is_open field

  const fetchLiveBalance = async () => {
    try {
      const res = await api.get('/admin/me');
      liveWalletBalance.value = res.data.wallet_balance || 0;
      isAcceptingOrders.value = res.data.is_accepting_orders ?? true;
    } catch (err) {
      console.warn('[Dashboard] Failed to fetch live wallet balance', err);
    }
    // Also poll is_open (operating hours) via the dashboard endpoint
    try {
      const dashRes = await api.get('/admin/restaurant/dashboard');
      const r = dashRes.data?.restaurant;
      if (r !== undefined) {
        // is_open is the computed field (manual toggle + hours check)
        isOpenBySchedule.value = r.is_open !== false;
      }
    } catch (err) {
      /* non-blocking */
    }
  };

  const toggleStoreStatus = async () => {
    try {
      const newValue = !isAcceptingOrders.value;
      await api.put('/dashboard/restaurant/status', {
        is_accepting_orders: newValue,
      });
      isAcceptingOrders.value = newValue;
    } catch (err) {
      console.error('[Dashboard] Failed to toggle store status', err);
      alert('Failed to update store status. Please try again.');
    }
  };

  onMounted(() => {
    setLanguage(currentLang.value);
    if (['restaurant_owner', 'admin'].includes(user.role)) {
      fetchLiveBalance();
    }
    // Boot global WebSocket for real-time order alerts
    if (['restaurant_owner', 'cashier'].includes(user.role)) {
      initGlobalWebSocket();
    }
  });

  onUnmounted(() => {
    if (_globalWs) _globalWs.close();
    if (_audioCtx) _audioCtx.close();
  });

  const walletBadgeClass = computed(() => {
    if (liveWalletBalance.value > 20) return 'bg-emerald-100 text-emerald-800';
    if (liveWalletBalance.value >= 0) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  });

  // ─── Global WebSocket + Audio (tab-persistent) ──────────────────────
  const unreadOrderCount = ref(0);
  let _globalWs = null;
  let _globalWsRetry = 0;
  let _audioCtx = null;
  let _audioUnlocked = false;

  // Unlock AudioContext on first user interaction (browser autoplay policy)
  const unlockAudio = () => {
    if (_audioUnlocked) return;
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    _audioUnlocked = true;
    document.body.removeEventListener('click', unlockAudio);
    document.body.removeEventListener('touchstart', unlockAudio);
  };
  document.body.addEventListener('click', unlockAudio, { once: true });
  document.body.addEventListener('touchstart', unlockAudio, { once: true });

  const playAlertSound = () => {
    try {
      if (!_audioCtx) {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (_audioCtx.state === 'suspended') _audioCtx.resume();
      const beep = (freq, startTime, duration) => {
        const osc = _audioCtx.createOscillator();
        const gain = _audioCtx.createGain();
        osc.connect(gain);
        gain.connect(_audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const t = _audioCtx.currentTime;
      beep(880, t, 0.12);
      beep(1100, t + 0.15, 0.12);
      beep(880, t + 0.3, 0.14);
    } catch (e) {
      console.warn('[Dashboard] Audio alert failed:', e);
    }
  };

  const initGlobalWebSocket = () => {
    if (!user?.restaurant_id) return;
    const token = localStorage.getItem('token');
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    const proto = isLocal ? 'ws:' : 'wss:';
    const host = isLocal ? 'localhost:8000' : 'api.mygeqo.com';
    const url = `${proto}//${host}/api/v1/dashboard/ws/${user.restaurant_id}`;
    const isRealToken = token && token !== 'cookie';
    _globalWs = isRealToken
      ? new WebSocket(url, [`bearer.${token}`])
      : new WebSocket(url);

    _globalWs.onopen = () => {
      _globalWsRetry = 0;
    };
    _globalWs.onclose = (ev) => {
      if (ev.code === 4001 || ev.code === 4003) return;
      _globalWsRetry++;
      const delay = Math.min(
        30000,
        Math.pow(2, _globalWsRetry) * 1000 + Math.random() * 800,
      );
      setTimeout(initGlobalWebSocket, delay);
    };
    _globalWs.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.event === 'NEW_ORDER') {
          // Only increment badge if user is NOT already on orders tab
          if (currentView.value !== 'orders') {
            unreadOrderCount.value++;
          }
          playAlertSound();
        }
      } catch (e) {
        // Ignore malformed messages
      }
    };
  };

  const navigateToOrders = () => {
    currentView.value = 'orders';
    unreadOrderCount.value = 0;
  };
  // ────────────────────────────────────────────────────────────────────

  const currentComponent = computed(() => {
    const role = user.role;
    const view = currentView.value;

    if (role === 'kitchen_staff') return 'KitchenMonitor';

    switch (view) {
      case 'overview':
        return 'Overview';
      case 'orders':
        return 'OrdersManager';
      case 'deliveries':
        return 'DeliveryManager';
      case 'restaurants':
        return role === 'admin' ? 'RestaurantsAdmin' : 'Overview';
      case 'menu':
        return 'MenuManager';
      case 'staff':
        return 'StaffManager';
      case 'drivers':
        return 'DriversManager';
      case 'audit-log':
        return 'AuditLog';
      case 'settings':
        return 'Settings';
      case 'billing':
        return 'Billing';
      case 'insights':
        return ['admin', 'restaurant_owner'].includes(role)
          ? 'SuperAdminInsights'
          : 'Overview';
      default:
        return 'Overview';
    }
  });

  const formatRole = (role) => {
    if (role === 'restaurant_owner') return 'Owner';
    if (role === 'kitchen_staff') return 'Kitchen Staff';
    return role;
  };

  const showUpgradeModal = ref(false);
  const hasFeature = (feat) => {
    if (user.role === 'admin') return true;
    return user.features && user.features[feat];
  };

  const handleNavClick = (viewName, featureRequired) => {
    if (featureRequired && !hasFeature(featureRequired)) {
      showUpgradeModal.value = true;
      return;
    }
    currentView.value = viewName;
  };

  return {
    showUpgradeModal,
    hasFeature,
    handleNavClick,
    currentView,
    currentComponent,
    formatRole,
    liveWalletBalance,
    walletBadgeClass,
    isAcceptingOrders,
    isOpenBySchedule,
    toggleStoreStatus,
    currentLang,
    setLanguage,
    t,
    unreadOrderCount,
    navigateToOrders,
  };
}
