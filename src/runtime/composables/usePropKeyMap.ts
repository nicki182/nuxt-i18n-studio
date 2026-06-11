// composables/usePropKeyMap.ts
// Provides O(1) candidate lookup by id.
// The index is loaded once by the prop-map plugin at app startup.

import type { PropCandidate } from "../types/ast";

export const usePropKeyMap = (): {
  resolveById: (id: string) => PropCandidate | null;
} => {
  // During SSR or before plugin has run, return a no-op resolver
  try {
    const { $i18nStudioResolveById } = useNuxtApp();
    return {
      resolveById: $i18nStudioResolveById as (id: string) => PropCandidate | null,
    };
  } catch {
    return {
      resolveById: () => null,
    };
  }
};
