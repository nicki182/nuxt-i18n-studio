import type { VNode, ComponentPublicInstance } from "vue";

import type { I18nInstance } from "../types/i18n";

import { useAST } from "../composables/useAST";
import { useStudioState } from "../composables/useStudioState";

interface ResolvedUsage {
  key: string;
  type: string;
  source: "static" | "traced" | "runtime" | "prop" | "prop-translated";
}

interface I18nHTMLElement extends HTMLElement {
  __i18nUsages?: ResolvedUsage[];
  __i18nHandler?: (e: Event) => void;
}

type OpenModalFn = (
  translations: { key: string; usages: string[]; source: string }[],
  el: HTMLElement,
) => void;

export default defineNuxtPlugin((nuxtApp) => {
  const { decodePayload, resolveUsages } = useAST();


  const directiveDef = {
    getSSRProps() {
      return {};
    },

    mounted(
      el: I18nHTMLElement,
      binding: { value: string; instance: ComponentPublicInstance | null },
      _vnode: VNode,
    ) {
      el.setAttribute("data-i18n-studio", "true");

      const { getPageKeys } = useStudioState();

      // binding.instance is the component instance that owns this element.
      // This is how Vue 3 exposes the component instance in directive hooks —
      // vnode.component is null for native DOM elements.
      const bindingInstance = binding.instance;

      const loadUsages = () => {
        try {
          const raw = binding.value ?? "";
          const payload = decodePayload(raw);

          if (!payload.length) {
            el.__i18nUsages = [];
            return;
          }

          const resolved = resolveUsages(payload, getPageKeys, bindingInstance);

          if (!resolved.length) {
            delete el.__i18nUsages;
            el.removeAttribute("data-i18n-studio");
            return;
          }

          el.__i18nUsages = resolved as ResolvedUsage[];
        } catch {
          el.__i18nUsages = [];
        }
      };

      loadUsages();

     const blockAndOpen = (e: Event) => {
        if (!document.body.classList.contains("i18n-studio-active")) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (e.type !== "click") return;

        loadUsages();

        const map = new Map<string, { usages: Set<string>; source: string }>();

        (el.__i18nUsages ?? []).forEach(({ key, type, source }) => {
          if (!key || key.endsWith("*")) return;
          if (!map.has(key)) map.set(key, { usages: new Set(), source });
          map.get(key)!.usages.add(type);
        });
        const translations = Array.from(map.entries()).map(
          ([key, { usages, source }]) => ({
            key,
            usages: Array.from(usages),
            source,
          }),
        );

        const openModal = nuxtApp.vueApp._context.provides[
          "i18n-open-modal"
        ] as OpenModalFn | undefined;

        if (openModal && translations.length > 0) {
          openModal(translations, el);
        }
      };


      el.__i18nHandler = blockAndOpen;

      ["click", "mousedown", "mouseup", "submit"].forEach((event) => {
        el.addEventListener(event, blockAndOpen, { capture: true });
      });
    },

    updated(
      el: I18nHTMLElement,
      binding: { value: string; instance: ComponentPublicInstance | null },
      _vnode: VNode,
    ) {
      try {
        const { getPageKeys } = useStudioState();
        const bindingInstance = binding.instance;

        const raw = binding.value ?? "";
        const payload = decodePayload(raw);

        if (!payload.length) return;

        const resolved = resolveUsages(payload, getPageKeys, bindingInstance);
        el.__i18nUsages = resolved.length ? (resolved as ResolvedUsage[]) : [];
      } catch {
        // Keep existing usages on error
      }
    },

    unmounted(el: I18nHTMLElement) {
      const handler = el.__i18nHandler;
      if (handler) {
        ["click", "mousedown", "mouseup", "submit"].forEach((event) => {
          el.removeEventListener(event, handler, { capture: true });
        });
      }
      delete el.__i18nUsages;
      delete el.__i18nHandler;
    },
  };

  nuxtApp.vueApp.directive("i18n-studio", directiveDef);

  // ── Fragment recovery mixin ────────────────────────────────────────────────
  // When the directive is on a fragment component, Vue drops it — but the
  // data-i18n-id attribute still lands on the exact DOM element because it's
  // a plain attribute, not a directive. We find it via querySelector and
  // manually call mounted() to attach the handler.
  nuxtApp.vueApp.mixin({
    mounted() {
      const instance = this.$;
      const dirs = instance?.vnode?.dirs as
        | Array<{
            dir: object;
            value: string;
            instance: ComponentPublicInstance | null;
          }>
        | undefined;
      if (!dirs?.length) return;

      const ourBinding = dirs.find((d) => d.dir === directiveDef);
      if (!ourBinding) return;

      const id = (instance.vnode.props as Record<string, string> | null)?.[
        "data-i18n-id"
      ];
      if (!id) return;

      // UUID in DOM = directive mounted normally, nothing to do
      if (document.querySelector(`[data-i18n-id="${id}"]`)) return;

      // UUID NOT in DOM = fragment. Only proceed if subTree children is a real array.
      const children = instance.subTree?.children;
      if (!Array.isArray(children) || !children.length) return;

      for (const child of children as VNode[]) {
        const el = (child?.el ??
          child?.component?.subTree?.el) as Element | null;
        if (!el || el.nodeType !== Node.ELEMENT_NODE) continue;
        if (el.hasAttribute("data-i18n-studio")) continue;

        directiveDef.mounted(
          el as I18nHTMLElement,
          { value: ourBinding.value, instance: ourBinding.instance },
          instance.vnode as unknown as VNode,
        );
      }
    },
  });
});
