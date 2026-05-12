
type OpenModalFn = (
  translations: { key: string; usages: string[] }[],
  el: HTMLElement
) => void;

// Safely evaluates functions, variables, and ternaries against the Vue component!
const evaluateExpr = (expr: string, ctx: any): string | undefined => {
  try {
    return new Function("ctx", `with(ctx) { return ${expr}; }`)(ctx);
  } catch (e) {
    return undefined;
  }
};

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive("i18n-studio", {
    getSSRProps() { return {}; },

    mounted(el: I18nHTMLElement, binding: any) {
       el.setAttribute("data-i18n-studio", "true");

      const loadUsages = () => {
        try {
          const raw = binding.value || "";
          // Fallback handling in case of raw vs base64
          const decoded = atob(raw.trim());

          const usages: { key: string; type: string }[] = JSON.parse(decoded);

          // Map and resolve expressions!
          el.__i18nUsages = usages.map(u => {
            let finalKey = u.key;

            if (finalKey.startsWith("__EXPR__")) {
              const expr = finalKey.replace("__EXPR__", "");
              finalKey = evaluateExpr(expr, binding.instance) || "";
            }

            return { key: finalKey, type: u.type }}).filter(u => u.key && !u.key.startsWith("__EXPR__")); // Drop failed evaluations
            if (el.__i18nUsages.length === 0) {
              delete el.__i18nUsages; // Clean up if no valid usages
              el.removeAttribute("data-i18n-studio");
              }
        } catch (e) {
          el.__i18nUsages = [];
        }
      };

      loadUsages();

      const blockAndOpen = (e: Event) => {
        if (!document.body.classList.contains("i18n-studio-active")) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (e.type === "click") {
          // Re-evaluate on click in case reactive state (or function return) changed!
          loadUsages();

          const map = new Map<string, Set<string>>();

          (el.__i18nUsages || []).forEach(({ key, type }) => {
            if (!key) return;
            if (!map.has(key)) map.set(key, new Set());
            map.get(key)!.add(type);
          });

          const translations = Array.from(map.entries()).map(([key, usages]) => ({
            key,
            usages: Array.from(usages),
          }));

          const openModal = nuxtApp.vueApp._context.provides["i18n-open-modal"] as OpenModalFn | undefined;
          if (openModal && translations.length > 0) {
            openModal(translations, el);
          }
        }
      };

      el.__i18nHandler = blockAndOpen;
      ["click", "mousedown", "mouseup", "submit"].forEach((event) => {
        el.addEventListener(event, blockAndOpen, { capture: true });
      });
    },

    updated(el: I18nHTMLElement, binding: any) {
      // Called when component state changes, so we can re-evaluate dynamic values
      try {
        const raw = el.getAttribute("data-i18n-studio") || binding.value || "";
        let decoded = raw;
        if (!raw.startsWith("[")) decoded = atob(raw.trim());

        const usages: { key: string; type: string }[] = JSON.parse(decoded);
        el.__i18nUsages = usages.map(u => {
          let finalKey = u.key;
          if (finalKey.startsWith("__EXPR__")) {
            finalKey = evaluateExpr(finalKey.replace("__EXPR__", ""), binding.instance) || "";
          }
          return { key: finalKey, type: u.type };
        }).filter(u => u.key);
      } catch (e) {}
    },

    unmounted(el: I18nHTMLElement) {
      const handler = el.__i18nHandler;
      if (handler) {
        ["click", "mousedown", "mouseup", "submit"].forEach((event) => {
          el.removeEventListener(event, handler, { capture: true });
        });
      }
    },
  });
});
