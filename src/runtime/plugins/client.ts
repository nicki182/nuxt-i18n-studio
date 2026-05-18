// ── client plugin ─────────────────────────────────────────────────────────────
// Mounts the Studio UI, provides the open-modal function, handles save/publish.

import {
  render,
  defineComponent,
  ref,
  reactive,
  h,
  nextTick,
  onMounted,
} from "vue";

import type { TranslationEntry } from "../types/ast";
import type { FetchError } from "../types/error";
import type { I18nInstance } from "../types/i18n";

import GithubTokenModal from "../components/GithubTokenModal.vue";
import I18nPageTranslations from "../components/I18nPageTranslationsButton.vue";
import StudioModal from "../components/StudioModal.vue";
import StudioSaveBar from "../components/StudioSaveBar.vue";
import { useStudioEffects } from "../composables/useStudioEffects";
import { useStudioToken } from "../composables/useStudioToken";
import { updateJSON } from "../utils/updateJSON";

/**
 * Nuxt plugin that mounts the i18n Studio UI and provides core functionality for interactive i18n key inspection and editing.
 * It manages state for pending translation changes, handles the save and publish workflow, and provides an open-modal function for the directive to display translation details.
 * The plugin also integrates with the i18n instance to update translations in-memory and persist changes via a server API.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return;

  // ── State ───────────────────────────────────────────────────────────────────
  const pendingChanges = ref<Record<string, string>>({});
  const isPublishing = ref(false);
  const isTokenModalOpen = ref(false);
  const clearOtherLocales = ref(false);
  const config = useRuntimeConfig().public.i18nStudio || {};

  const modalState = reactive({
    open: false,
    translations: [] as TranslationEntry[],
    targetElement: null as HTMLElement | null | undefined,
    initialValues: {} as Record<string, string>,
  });

  // ── open-modal provider ─────────────────────────────────────────────────────
  // Provided via Vue's provide/inject so the directive can call it without
  // needing a direct import (directive runs in a different plugin context).
  nuxtApp.vueApp.provide(
    "i18n-open-modal",
    (translations: TranslationEntry[], el: HTMLElement) => {
      modalState.translations = translations;
      modalState.targetElement = el;

      const i18n = (nuxtApp as unknown as { $i18n?: I18nInstance }).$i18n;
      const currentLocale = i18n?.locale?.value || "en";
      const messages = i18n?.getLocaleMessage?.(currentLocale) || {};

      const initials: Record<string, string> = {};

      translations.forEach((t) => {
        // Layer 1: look up the raw value from the i18n message store
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
          "loc" in (resolved as object)
        ) {
          // Vue-i18n compiled message proxy
          const compiledObj = resolved as { loc?: { source?: string } };
          if (typeof compiledObj.loc?.source === "string") {
            rawJsonVal = compiledObj.loc.source;
          }
        }

        // Layer 2: DOM fallback for text/attr usages
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
    },
  );

  // ── Studio UI ───────────────────────────────────────────────────────────────
  const studioRoot = document.createElement("div");
  studioRoot.id = "i18n-studio-ui-root";
  document.body.appendChild(studioRoot);

  const StudioUI = defineComponent({
    setup() {
      const { isAuthenticated, checkAuth, login, logout } = useStudioToken();
      const { checkHmrAttached, markHmrAttached } = useStudioEffects(() => {
        modalState.open = false;
        isTokenModalOpen.value = false;
      });

      onMounted(() => {
        if (!import.meta.dev) checkAuth();
      });

      // ── Save (local, updates vue-i18n in-memory) ──────────────────────────
      const handleSave = (newTranslations: Record<string, string>) => {
        Object.assign(pendingChanges.value, newTranslations);

        const i18n = nuxtApp.$i18n;
        const currentLocale = i18n?.locale?.value || "en";

        if (i18n) {
          let updatedMessages = { ...i18n.getLocaleMessage(currentLocale) };

          Object.entries(newTranslations).forEach(([key, val]) => {
            const result = updateJSON(
              updatedMessages,
              key,
              val,
              config.isFlatJson,
            );
            if (result) updatedMessages = result;
          });

          i18n.mergeLocaleMessage(currentLocale, updatedMessages);
        }

        modalState.open = false;
      };

      // ── Publish (persists to locale files via server API) ─────────────────
      const saveTokenAndPublish = async (token: string) => {
        try {
          await login(token);
          isTokenModalOpen.value = false;
          handlePublish(clearOtherLocales.value);
        } catch {
          alert("Invalid GitHub Token. Please check your token and try again.");
        }
      };

      async function handlePublish(clearLocales: boolean) {
        if (!isAuthenticated.value && !import.meta.dev) {
          clearOtherLocales.value = clearLocales;
          isTokenModalOpen.value = true;
          return;
        }

        isPublishing.value = true;
        const changesToApply = { ...pendingChanges.value };
        const i18n = (nuxtApp as unknown as { $i18n?: I18nInstance }).$i18n;
        const currentLocale = i18n?.locale?.value || "en";

        try {
          const response = await $fetch<{
            success: boolean;
            json?: Record<string, unknown>;
          }>("/api/__i18n_studio/update", {
            method: "POST",
            body: {
              updates: changesToApply,
              locale: currentLocale,
              clearOtherLocales: clearLocales,
            },
          });

          if (response.success && response.json && i18n) {
            i18n.mergeLocaleMessage(currentLocale, response.json);

            const hmrHandler = () => {
              if (i18n && response.json) {
                i18n.mergeLocaleMessage(currentLocale, response.json);
                const temp = i18n.locale.value;
                i18n.locale.value = "";
                nextTick(() => {
                  i18n.locale.value = temp;
                });
              }
            };

            if (import.meta.hot && !checkHmrAttached()) {
              markHmrAttached();
              import.meta.hot.on("vite:afterUpdate", hmrHandler);
            }
          }

          pendingChanges.value = {};
        } catch (err: unknown) {
          const fetchError = err as FetchError;
          console.error("Publish failed:", fetchError);

          if (fetchError.response?.status === 401) {
            logout();
            alert(
              "Your GitHub token session expired or was rejected. Please authenticate again.",
            );
            isTokenModalOpen.value = true;
          }
        } finally {
          isPublishing.value = false;
        }
      }

      return () => [
        h(StudioModal, {
          isOpen: modalState.open,
          // Pass full TranslationEntry shape — modal can now show source badges
          // e.g. "traced from script" vs "resolved at runtime"
          translations: modalState.translations,
          targetElement: modalState.targetElement,
          initialValues: modalState.initialValues,
          onClose: () => {
            modalState.open = false;
          },
          onSave: handleSave,
        }),
        h(StudioSaveBar, {
          count: Object.keys(pendingChanges.value).length,
          loading: isPublishing.value,
          onPublish: handlePublish,
          initialClearLocales: config.cleanOnValueChange,
          isPublishingToGithub: !import.meta.dev,
        }),
        h(I18nPageTranslations),
        h(GithubTokenModal, {
          isOpen: isTokenModalOpen.value,
          onClose: () => {
            isTokenModalOpen.value = false;
          },
          onSubmit: saveTokenAndPublish,
        }),
      ];
    },
  });

  render(h(StudioUI), studioRoot);
});
