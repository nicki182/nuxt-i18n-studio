import { useStudioState } from "../composables/useStudioState";

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server || !import.meta.dev) return;

  const { addKey, clearKeys } = useStudioState();

  // We use `app:created` to ensure the Vue app exists, but we intercept `globalProperties.$t`
  nuxtApp.hook("app:created", () => {
    const globalProps = nuxtApp.vueApp.config.globalProperties;

    // Check if $t exists on the global properties (injected by @nuxtjs/i18n)
    if (typeof globalProps.$t !== "function") {
      console.warn("[i18n Studio] Could not find global $t function to track.");
      return;
    }

    const originalT = globalProps.$t;

    // Override the global $t function used in templates
    globalProps.$t = function (this: unknown, ...args: unknown[]) {
      const key = args[0];
      if (typeof key === "string") {
        addKey(key);
      }

      // Safely call the original $t function
      return originalT.apply(this, args);
    };
  });

  // Clear keys when navigating to a new page
  nuxtApp.hook("page:finish", () => {
    clearKeys();
  });
});
