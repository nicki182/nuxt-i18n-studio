import { defineNuxtPlugin } from "#app";

// 2. Define the exact shape of the provided modal function
type OpenModalFn = (
  translations: { key: string; usages: string[] }[],
  el: HTMLElement,
) => void;

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive("i18n-studio", {
    // 1. Ensure SSR doesn't crash by providing an empty hook
    getSSRProps() {
      return {};
    },
    // 2. Client-side Exact Element Binding
    mounted(el: I18nHTMLElement) {
      const blockAndOpen = (e: Event) => {
        // Only run if Studio mode is active!
        if (!document.body.classList.contains("i18n-studio-active")) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (e.type === "click") {
          const keyAttr = el.getAttribute("data-i18n-key") || "";
          const attrsAttr = el.getAttribute("data-i18n-attrs");

          const map = new Map<string, Set<string>>();

          if (attrsAttr) {
            const attrList = JSON.parse(attrsAttr) as {
              attr: string;
              key: string;
            }[];
            attrList.forEach(({ attr, key }) => {
              if (!map.has(key)) map.set(key, new Set());
              map.get(key)!.add(`attr:${attr}`);
            });
          }

          keyAttr
            .split(",")
            .filter(Boolean)
            .forEach((k) => {
              if (!map.has(k)) {
                map.set(k, new Set<string>());
                map.get(k)!.add("text");
              }
            });

          const translations = Array.from(map.entries()).map(
            ([key, usages]) => ({
              key,
              usages: Array.from(usages),
            }),
          );

          // Trigger your modal exactly on this element with strict typing
          const openModal = nuxtApp.vueApp._context.provides[
            "i18n-open-modal"
          ] as OpenModalFn | undefined;
          if (openModal) {
            openModal(translations, el);
          }
        }
      };

      // Safely assign without `any`
      el.__i18nHandler = blockAndOpen;

      // Attach exact listeners to `el`
      ["click", "mousedown", "mouseup", "submit"].forEach((event) => {
        el.addEventListener(event, blockAndOpen, { capture: true });
      });
    },
    unmounted(el: I18nHTMLElement) {
      // Clean up the exact listeners when the element is removed without `any`
      const handler = el.__i18nHandler;
      if (handler) {
        ["click", "mousedown", "mouseup", "submit"].forEach((event) => {
          el.removeEventListener(event, handler, { capture: true });
        });
      }
    },
  });
});
