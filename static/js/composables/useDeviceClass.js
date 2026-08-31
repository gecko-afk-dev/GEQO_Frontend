import {
  ref,
  computed,
  onMounted,
  onUnmounted,
} from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

const LG_BREAKPOINT_PX = 1024; // Tailwind's `lg` breakpoint
const POINTER_QUERY = '(pointer: coarse)';

export function useDeviceClass() {
  const hasCoarsePointer = ref(false);
  const viewportWidth = ref(0);

  let pointerMql = null;
  const handlePointerChange = (e) => {
    hasCoarsePointer.value = e.matches;
  };
  const handleResize = () => {
    viewportWidth.value = window.innerWidth;
  };

  onMounted(() => {
    pointerMql = window.matchMedia(POINTER_QUERY);
    hasCoarsePointer.value = pointerMql.matches;
    viewportWidth.value = window.innerWidth;
    pointerMql.addEventListener('change', handlePointerChange);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
  });

  onUnmounted(() => {
    if (pointerMql) {
      pointerMql.removeEventListener('change', handlePointerChange);
    }
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleResize);
  });

  const isAppShell = computed(
    () => hasCoarsePointer.value && viewportWidth.value < LG_BREAKPOINT_PX,
  );

  return { isAppShell };
}
