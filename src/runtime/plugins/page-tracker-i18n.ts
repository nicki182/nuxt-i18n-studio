import type { I18nInstance } from "../types/i18n";

import { useStudioState } from "../composables/useStudioState";

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server || !import.meta.dev) return;

  const { addKey, clearKeys } = useStudioState();

  nuxtApp.hook("app:created", () => {
    // 2. Safely cast the Nuxt app to include our expected $i18n type
    const app = nuxtApp as unknown as { $i18n?: I18nInstance };

    if (!app.$i18n || typeof app.$i18n.t !== "function") return;

    const originalT = app.$i18n.t;

    // 3. Use standard function notation so `this` is correctly inferred for `apply`
    app.$i18n.t = function (this: I18nInstance, ...args: unknown[]) {
      const key = args[0];
      if (typeof key === "string") {
        addKey(key);
      }

      // 4. Safely apply without using `any`
      return originalT.apply(this, args);
    };
  });

  nuxtApp.hook("page:finish", () => {
    clearKeys();
  });
});
