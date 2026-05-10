// 1. Shared Global State (Singleton - defined outside the function)
import { ref } from "vue";

const isStudioMode = ref(false);
const pageKeys = ref<string[]>([]);

// Placeholders for our timer controls
const freezeControls = {
  flush: () => {},
  cancelAll: () => {},
};

/**
 *
 */
export function useStudioState() {
  const toggleMode = (forceState?: boolean) => {
    isStudioMode.value =
      forceState !== undefined ? forceState : !isStudioMode.value;

    // Automatically flush timers when turning Studio Mode off
    if (!isStudioMode.value) {
      freezeControls.flush();
    }
  };

  const addKey = (key: string) => {
    // Only add if it doesn't already exist
    if (!pageKeys.value.includes(key)) {
      pageKeys.value.push(key);
    }
  };

  const clearKeys = () => {
    pageKeys.value = [];
  };

  return {
    isStudioMode,
    pageKeys,
    freezeControls,
    toggleMode,
    addKey,
    clearKeys,
  };
}
