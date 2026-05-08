import {
  render,
  h,
  defineComponent,
  ref,
  reactive,
  nextTick,
  onMounted,
} from "vue";

import type { I18nInstance } from "../types/i18n";

import GithubTokenModal from "../components/GithubTokenModal.vue";
import I18nPageTranslations from "../components/I18nPageTranslationsModal.vue";
import StudioModal from "../components/StudioModal.vue";
import StudioSaveBar from "../components/StudioSaveBar.vue";
import { useStudioEffects } from "../composables/useStudioEffects";
import { useStudioToken } from "../composables/useStudioToken";

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return;

  // ── STATE ─────────────────────────────────────────────────
  const pendingChanges = ref<Record<string, string>>({});
  const isPublishing = ref(false);
  const isTokenModalOpen = ref(false);

  const modalState = reactive({
    open: false,
    translations: [] as { key: string; usages: string[] }[],
    targetElement: null as HTMLElement | null | undefined,
    initialValues: {} as Record<string, string>,
  });

  const resolveNestedKey = (obj: unknown, path: string): string => {
    const value = path.split(".").reduce((acc: unknown, part: string) => {
      if (acc && typeof acc === "object" && acc !== null) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
    return typeof value === "string" ? value : "";
  };

  // ── PROVIDE FOR UI COMPONENTS ─────────────────────────────
  nuxtApp.vueApp.provide(
    "i18n-open-modal",
    (translations: { key: string; usages: string[] }[], el?: HTMLElement) => {
      modalState.translations = translations;
      modalState.targetElement = el;

      const i18n = (nuxtApp as unknown as { $i18n?: I18nInstance }).$i18n;
      const currentLocale = i18n?.locale?.value || "en";
      const messages = i18n?.getLocaleMessage?.(currentLocale) || {};

      const initials: Record<string, string> = {};

      translations.forEach((t) => {
        let currentVal = resolveNestedKey(messages, t.key);

        t.usages.forEach((u) => {
          if (el) {
            if (u === "text") {
              const domVal = el.textContent?.trim();
              if (domVal) currentVal = domVal;
            } else if (u.startsWith("attr:")) {
              const attrName = u.slice(5);
              const domVal = el.getAttribute(attrName);
              if (domVal) currentVal = domVal;
            }
          }
        });
        initials[t.key] = pendingChanges.value[t.key] ?? currentVal;
      });

      modalState.initialValues = initials;
      modalState.open = true;
    },
  );

  // ── MOUNT REACTIVE UI ─────────────────────────────────────
  const studioRoot = document.createElement("div");
  studioRoot.id = "i18n-studio-ui-root";
  document.body.appendChild(studioRoot);

  const StudioUI = defineComponent({
    setup() {
      // Initialize our new composables!
      const { githubToken, loadToken, saveToken, clearToken } =
        useStudioToken();

      const { checkHmrAttached, markHmrAttached } = useStudioEffects(() => {
        // This fires automatically when Ctrl+Shift+F turns Studio off
        modalState.open = false;
        isTokenModalOpen.value = false;
      });

      onMounted(() => {
        loadToken();
      });

      const handleSave = (vals: Record<string, string>) => {
        Object.assign(pendingChanges.value, vals);
        const el = modalState.targetElement;

        modalState.translations.forEach((t) => {
          const newVal = vals[t.key] ?? "";
          if (el) {
            t.usages.forEach((u) => {
              if (u === "text") {
                el.textContent = newVal;
              } else if (u.startsWith("attr:")) {
                const attrName = u.slice(5);
                el.setAttribute(attrName, String(newVal));
              }
            });
          }
        });
        modalState.open = false;
      };

      const saveTokenAndPublish = (token: string) => {
        saveToken(token);
        isTokenModalOpen.value = false;
        handlePublish();
      };

      async function handlePublish() {
        if (!githubToken.value) {
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
            headers: { Authorization: `Bearer ${githubToken.value}` },
            body: { updates: changesToApply, locale: currentLocale },
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

            // HMR handled purely via module state now!
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
            clearToken();
            alert("GitHub token is invalid or expired. Please try again.");
          }
        } finally {
          isPublishing.value = false;
        }
      }

      return () => [
        h(StudioModal, {
          isOpen: modalState.open,
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
