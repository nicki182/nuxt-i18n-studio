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
 * Composable that provides reactive state and functions for managing i18n Studio mode, including:
 * - isStudioMode: A reactive boolean that indicates whether i18n Studio mode is currently active.
 * - pageKeys: A reactive array that holds the list of i18n keys extracted from the current page, which can be used for tracking and display in the UI.
 * - freezeControls: An object with placeholder functions for managing timers related to freezing the page (e.g., for hover previews), allowing other parts of the plugin to register their timer control functions here.
 * - toggleMode: A function to toggle i18n Studio mode on and off, which also automatically flushes any registered timers when turning off Studio mode to ensure a clean state.
 * - addKey: A function to add a new i18n key to the pageKeys array, ensuring that duplicates are not added.
 * - clearKeys: A function to clear all keys from the pageKeys array, useful when navigating to a new page or resetting state.
 * - getPageKeys: A function to retrieve the current list of page keys, which can be used by other composables or components to access the keys without directly exposing the reactive reference.
 * @returns An object containing the reactive state and functions for managing i18n Studio mode and page keys.
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

  const getPageKeys = () => {
    return pageKeys.value;
  };

  return {
    isStudioMode,
    pageKeys,
    freezeControls,
    toggleMode,
    addKey,
    clearKeys,
    getPageKeys,
  };
}
