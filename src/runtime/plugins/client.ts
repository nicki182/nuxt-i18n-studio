import { createApp, h } from 'vue';

import StudioUI from '../components/StudioUI.vue';
import { useStudioState } from '../composables/useStudioState';

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return;

  const { openStudioModal, closeStudioModal } = useStudioState();

  window.addEventListener("i18n-studio:open", (e: Event) => {
    const { translations, el } = (e as CustomEvent).detail;
    openStudioModal(translations, el);
  });

  window.addEventListener("i18n-studio:close", () => {
    closeStudioModal();
  });

  // Wait for app to be fully mounted before rendering Studio UI
  nuxtApp.hook("app:mounted", () => {
    const studioRoot = document.createElement("div");
    studioRoot.id = "i18n-studio-ui-root";
    document.body.appendChild(studioRoot);

    // Create isolated app that shares the parent's provides
    const studioApp = createApp({ render: () => h(StudioUI) });
    studioApp._context.provides = Object.assign(
      Object.create(null),
      nuxtApp.vueApp._context.provides,
    );
    studioApp.mount(studioRoot);
  });
});
