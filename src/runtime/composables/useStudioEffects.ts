import { onMounted, onUnmounted, watch } from "vue";

import { useStudioState } from "./useStudioState";

let isHmrAttached = false;

/**
 *
 * @param onToggleOff
 */
export function useStudioEffects(onToggleOff: () => void) {
  const { isStudioMode, toggleMode } = useStudioState();

  const handleKeydown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
      e.preventDefault();
      e.stopPropagation();

      toggleMode(); // Toggles state & flushes timers automatically

      if (!isStudioMode.value) {
        onToggleOff(); // Close any open modals
      }
    }
  };

  // Reactively toggle DOM classes based on state
  watch(
    isStudioMode,
    (active) => {
      if (typeof document === "undefined") return;
      if (active) {
        document.body.classList.add("i18n-studio-active");
        document.documentElement.classList.add("i18n-frozen");
      } else {
        document.body.classList.remove("i18n-studio-active");
        document.documentElement.classList.remove("i18n-frozen");
      }
    },
    { immediate: true },
  );

  onMounted(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKeydown);
    }
  });

  onUnmounted(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", handleKeydown);
    }
  });

  const checkHmrAttached = () => isHmrAttached;
  const markHmrAttached = () => {
    isHmrAttached = true;
  };

  return {
    checkHmrAttached,
    markHmrAttached,
  };
}
