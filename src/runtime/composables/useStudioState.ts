// 1. Shared Global State (Singleton - defined outside the function)
import { ref, reactive } from "vue";

import type { TranslationEntry } from "../types/ast";
import type { I18nInstance } from "../types/i18n";

// Placeholders for our timer controls
const freezeControls = {
  flush: () => {},
  cancelAll: () => {},
};
const pendingChanges = ref<Record<string, string>>({});
const isStudioMode = ref(false);
const pageKeys = ref<string[]>([]);
const modalState = reactive({
  open: false,
  translations: [] as TranslationEntry[],
  targetElement: null as HTMLElement | null | undefined,
  initialValues: {} as Record<string, string>,
});

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
  const nuxtApp = useNuxtApp();

  const toggleMode = (forceState?: boolean) => {
    isStudioMode.value =
      forceState !== undefined ? forceState : !isStudioMode.value;

    // Automatically flush timers when turning Studio Mode off
    if (!isStudioMode.value) {
      freezeControls.flush();
    }
  };
  /**
   * Calculates initial values and opens the modal.
   * Called by the directive via the provide/inject bridge.
   */
  // ── Actions ──────────────────────────────────────────────────────────────
  const openStudioModal = (
    translations: TranslationEntry[],
    el: HTMLElement,
  ) => {
    modalState.translations = translations;
    modalState.targetElement = el;

    const i18n = (nuxtApp as unknown as { $i18n?: I18nInstance }).$i18n;
    const currentLocale = i18n?.locale?.value || "en";
    const messages = i18n?.getLocaleMessage?.(currentLocale) || {};

    const initials: Record<string, string> = {};

    translations.forEach((t) => {
      // Layer 1: i18n store lookup
      const resolved = t.key.split(".").reduce((o: unknown, k: string) => {
        if (o && typeof o === "object" && k in (o as object)) {
          return (o as Record<string, unknown>)[k];
        }
        return undefined;
      }, messages);

      let rawJsonVal = "";
      if (typeof resolved === "string") {
        rawJsonVal = resolved;
      } else if (
        resolved !== null &&
        typeof resolved === "object" &&
        "loc" in resolved
      ) {
        const compiledObj = resolved as { loc?: { source?: string } };
        if (typeof compiledObj.loc?.source === "string") {
          rawJsonVal = compiledObj.loc.source;
        }
      }

      // Layer 2: DOM fallback
      let fallbackDomVal = "";
      t.usages.forEach((u) => {
        if (u === "text:dynamic" || u === "text") {
          const domVal = el?.textContent?.trim();
          if (domVal) fallbackDomVal = domVal;
        } else if (u.startsWith("attr:")) {
          const attrName = u.slice(5);
          const domVal = el?.getAttribute(attrName);
          if (domVal) fallbackDomVal = domVal;
        }
      });

      initials[t.key] =
        pendingChanges.value[t.key] || rawJsonVal || fallbackDomVal;
    });

    modalState.initialValues = initials;
    modalState.open = true;
  };

  const closeStudioModal = () => {
    modalState.open = false;
    modalState.translations = [];
    modalState.targetElement = null;
    modalState.initialValues = {};

    // 🔔 Broadcast to the main app (e.g., the directive) that the modal is closed
    window.dispatchEvent(new CustomEvent("i18n-studio:closed"));
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
    openStudioModal,
    closeStudioModal,
    modalState,
    pendingChanges,
  };
}
