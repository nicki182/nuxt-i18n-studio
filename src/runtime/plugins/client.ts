import { render } from "vue";

import type { FetchError } from "../types/error";
import type { I18nInstance } from "../types/i18n";

import GithubTokenModal from "../components/GithubTokenModal.vue";
import I18nPageTranslations from "../components/I18nPageTranslationsButton.vue";
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
  const clearOtherLocales = ref(false);
  const config = useRuntimeConfig().public.i18nStudio || {};
  const modalState = reactive({
    open: false,
    translations: [] as { key: string; usages: string[] }[],
    targetElement: null as HTMLElement | null | undefined,
    initialValues: {} as Record<string, string>,
  });

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
        let rawJsonVal = "";

        // 1. Get the raw value from the i18n instance safely
        const resolved = t.key.split(".").reduce((o: unknown, k: string) => {
          // Safely traverse the object tree
          if (o && typeof o === "object" && o !== null && k in o) {
            return (o as Record<string, unknown>)[k];
          }
          return undefined;
        }, messages);

        // 2. Safely check the types of the resolved value
        if (typeof resolved === "string") {
          // It's a plain string
          rawJsonVal = resolved;
        } else if (
          resolved !== null &&
          typeof resolved === "object" &&
          "loc" in resolved
        ) {
          // It's a Vue-i18n compiled message (Proxy/Function)
          const compiledObj = resolved as { loc?: { source?: string } };
          if (typeof compiledObj.loc?.source === "string") {
            rawJsonVal = compiledObj.loc.source;
          }
        }

        let fallbackDomVal = "";
        t.usages.forEach((u) => {
          if (u === "text") {
            const domVal = el?.textContent?.trim();
            if (domVal) fallbackDomVal = domVal;
          } else if (u.startsWith("attr:")) {
            const attrName = u.slice(5);
            const domVal = el?.getAttribute(attrName);
            if (domVal) fallbackDomVal = domVal;
          }
        });

        // 3. Assign the initial value (make sure to use .translations here since we restructured it!)
        initials[t.key] =
          pendingChanges.value.translations[t.key] ||
          rawJsonVal ||
          fallbackDomVal;
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
      // Initialize our new secure token composable!
      const { isAuthenticated, checkAuth, login, logout } = useStudioToken();

      const { checkHmrAttached, markHmrAttached } = useStudioEffects(() => {
        // This fires automatically when Ctrl+Shift+F turns Studio off
        modalState.open = false;
        isTokenModalOpen.value = false;
      });

      onMounted(() => {
        // Check the server session cookie on mount
        if (!import.meta.dev) checkAuth();
      });

      const handleSave = (vals: Record<string, string>) => {
        Object.assign(pendingChanges.value, { ...vals });
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

      const saveTokenAndPublish = async (token: string) => {
        try {
          // Attempt to login using the server endpoint
          await login(token);
          isTokenModalOpen.value = false;
          handlePublish(clearOtherLocales.value);
        } catch {
          alert("Invalid GitHub Token. Please check your token and try again.");
        }
      };

      async function handlePublish(clearLocales: boolean) {
        // 1. Check our boolean reactive state (managed by cookie check)
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
          // 2. We NO LONGER pass Authorization headers! The browser sends the secure cookie.
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
            // 3. Clear the server session if unauthorized
            logout();
            alert(
              "Your GitHub token session expired or was rejected. Please authenticate again.",
            );
            isTokenModalOpen.value = true; // Re-open the modal
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
          initialClearLocales: config.cleanOnValueChange,
          isPublishingToGithub: !import.meta.dev, // Only show "to GitHub" in dev mode where the token modal is relevant
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
