import type { DirectiveBinding, ComponentPublicInstance } from "vue";

import type { TranslationEntry, KeyExtractionType } from "../types/ast";
import type { I18nHTMLElement } from "../types/i18nHTMLElement";

import { useAST } from "../composables/useAST";
import { useStudioState } from "../composables/useStudioState";

type OpenModalFn = (translations: TranslationEntry[], el: HTMLElement) => void;

// ── Directive ─────────────────────────────────────────────────────────────────

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive("i18n-studio", {
    getSSRProps() {
      return {};
    },

    mounted(el: I18nHTMLElement, binding: DirectiveBinding<string>) {
      el.setAttribute("data-i18n-studio", "true");

      const { getPageKeys } = useStudioState();
      const { decodePayload, resolveUsages } = useAST();

      const loadUsages = () => {
        try {
          const raw = binding.value || "";
          const payload = decodePayload(raw);

          if (!payload.length) {
            el.__i18nUsages = [];
            return;
          }

          const resolved = resolveUsages(
            payload,
            binding.instance as ComponentPublicInstance | null,
            getPageKeys,
          );

          if (!resolved.length) {
            delete el.__i18nUsages;
            el.removeAttribute("data-i18n-studio");
            return;
          }

          el.__i18nUsages = resolved;
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

        // Re-evaluate on every click — reactive state may have changed
        loadUsages();

        // Collapse to key → usages map, merging duplicate keys
        const map = new Map<
          string,
          { usages: Set<string>; source: KeyExtractionType }
        >();

        (el.__i18nUsages || []).forEach(({ key, type, source }) => {
          if (!key || key.endsWith("*")) return; // skip unresolved prefixes

          if (!map.has(key))
            map.set(key, {
              usages: new Set(),
              source: source as KeyExtractionType,
            });
          map.get(key)!.usages.add(type);
        });

        const translations: TranslationEntry[] = Array.from(map.entries()).map(
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

    // Re-resolve when component state changes (reactive values, props)
    updated(el: I18nHTMLElement, binding: DirectiveBinding<string>) {
      try {
        const { getPageKeys } = useStudioState();
        const { decodePayload, resolveUsages } = useAST();
        const raw = binding.value || "";
        const payload = decodePayload(raw);

        if (!payload.length) return;

        const resolved = resolveUsages(
          payload,
          binding.instance as ComponentPublicInstance | null,
          getPageKeys,
        );
        el.__i18nUsages = resolved.length ? resolved : [];
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
  });
});
