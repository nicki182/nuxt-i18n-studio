// plugins/prop-map.ts
// Fetches the flat prop-id index at app startup and provides it
// via useNuxtApp as $i18nStudioResolveById for use in usePropKeyMap.

import type { PropCandidate } from "../types/ast";

export default defineNuxtPlugin(async () => {
  if (import.meta.server) return;

  let index = new Map<string, PropCandidate>();

  try {
    const data = await $fetch<Record<string, PropCandidate>>(
      "/__i18n_studio/prop-map.json",
    );

    if (data && typeof data === "object") {
      index = new Map(Object.entries(data));
    }
  } catch {
    // No prop-map.json available — prop chain resolution will be skipped
    // Run `i18n-studio analyze` to enable it
  }

  return {
    provide: {
      i18nStudioResolveById: (id: string): PropCandidate | null => {
        return index.get(id) ?? null;
      },
    },
  };
});
