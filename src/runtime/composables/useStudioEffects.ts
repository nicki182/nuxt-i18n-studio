import { onMounted, onUnmounted, watch } from "vue";

import { useStudioState } from "./useStudioState";

let isHmrAttached = false;

/**
 * Composable that manages the side effects of toggling i18n Studio mode, including:
 * - Adding/removing CSS classes to the document body and root element to reflect the active state of i18n Studio mode.
 * - Setting up a global keyboard shortcut (Ctrl/Cmd + Shift + F) to toggle i18n Studio mode on and off.
 * - Providing functions to check and mark HMR attachment status, which can be used by other parts of the plugin to ensure that certain effects or listeners are only set up once.
 * @param onToggleOff A callback function that is called when i18n Studio mode is toggled off, allowing the caller to perform any necessary cleanup (e.g., closing modals, resetting state) when exiting Studio mode.
 * @returns An object containing the checkHmrAttached and markHmrAttached functions for managing HMR attachment status.
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
