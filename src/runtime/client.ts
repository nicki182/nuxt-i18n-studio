import { render } from "vue";
import StudioModal from "./components/StudioModal.vue";
import StudioSaveBar from "./components/StudioSaveBar.vue";

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return;

  const isStudioMode = ref(false);
  const isPublishing = ref(false);
  const pendingChanges = ref<Record<string, string>>({});

  const uiState = reactive({
    modalOpen: false,
    modalKeys: [] as string[],
    modalInitialValues: {} as Record<string, string>,
    targetElement: null as HTMLElement | null,
  });

  // Provide to Ghost Components
  nuxtApp.vueApp.provide("i18n-studio-active", isStudioMode);
  nuxtApp.vueApp.provide(
    "i18n-open-modal",
    (keys: string[], el: HTMLElement) => {
      uiState.modalKeys = keys;
      uiState.targetElement = el;
      uiState.modalInitialValues = {};

      // @ts-ignore
      const messages = nuxtApp.$i18n.getLocaleMessage(
        nuxtApp.$i18n.locale.value,
      );
      keys.forEach((k) => {
        const raw = k.split(".").reduce((o: any, i) => o?.[i], messages);
        uiState.modalInitialValues[k] =
          pendingChanges.value[k] ||
          (raw?.loc?.source && typeof raw.loc.source === "string"
            ? raw.loc.source
            : k);
      });
      uiState.modalOpen = true;
    },
  );

  // Mount Singleton UI
  const studioRoot = document.createElement("div");
  studioRoot.id = "i18n-studio-ui-root";
  document.body.appendChild(studioRoot);

  render(
    h(() => [
      h(StudioModal, {
        isOpen: uiState.modalOpen,
        keys: uiState.modalKeys,
        initialValues: uiState.modalInitialValues,
        onClose: () => {
          uiState.modalOpen = false;
        },
        onSave: (vals: Record<string, string>) => {
          Object.assign(pendingChanges.value, vals);

          if (uiState.targetElement) {
            uiState.targetElement.innerText = Object.values(vals)[0] as string;
            uiState.targetElement.style.outline = "2px dashed #eab308";
          }

          // // @ts-ignore
          // nuxtApp.$i18n.mergeLocaleMessage(
          //   nuxtApp.$i18n.locale.value,
          //   unflatten(vals),
          // );
          uiState.modalOpen = false;
        },
      }),
      h(StudioSaveBar, {
        count: Object.keys(pendingChanges.value).length,
        loading: isPublishing.value,
        onPublish: handlePublish,
      }),
    ]),
    studioRoot,
  );

  async function handlePublish() {
    isPublishing.value = true;
    // @ts-ignore
    const changesToApply = { ...pendingChanges.value };
    const i18n = nuxtApp.$i18n;
    const currentLocale = i18n?.locale?.value || "en";

    console.log("Preparing to publish changes:", changesToApply);

    try {
      const response = await $fetch("/api/__i18n_studio/update", {
        method: "POST",
        body: { updates: changesToApply, locale: currentLocale },
      });
      console.log("Publish response:", response);

      // 1. Create a STABLE reference for the HMR handler
      const hmrHandler = () => {

        console.log("Applying native i18n sync with JSON:", response.json);
        i18n.mergeLocaleMessage(currentLocale, response.json);

        // Trigger reactivity
        const temp = i18n.locale.value;
        i18n.locale.value = "";
        nextTick(() => {
          i18n.locale.value = temp;
        });
      };

      // 3. Add the listener using the stable reference
     if (import.meta.hot && !window.__i18n_hmr_attached && response.success && response.json) {
        window.__i18n_hmr_attached = true
        import.meta.hot.on("vite:afterUpdate", hmrHandler);
      }

      pendingChanges.value = {};
    } catch (err) {
      console.error("Studio Publish Failed:", err);
    } finally {
      isPublishing.value = false;
    }
  }

  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
      e.preventDefault();
      e.stopPropagation()
      isStudioMode.value = !isStudioMode.value;
      document.body.classList.toggle("i18n-studio-active", isStudioMode.value);
    }
  });
});
