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

// ── Vnode tree walker ─────────────────────────────────────────────────────────
// Walks the vnode subtree of a component instance to find a DOM element
// whose data-i18n-prop-ids attribute contains the given propId.
// Scoped to this instance's subtree — avoids cross-instance matches.

interface VNodeLike {
  el?: Element | null;
  children?: unknown;
  component?: { subTree?: VNodeLike } | null;
  shapeFlag?: number;
}

function findElByPropId(
  vnode: unknown,
  propId: string,
  element: string,
): Element | null {
  if (!vnode || typeof vnode !== "object") return null;
  const v = vnode as VNodeLike;

  // Check this vnode's DOM element
  if (v.el && v.el.nodeType === Node.ELEMENT_NODE) {
    const ids = v.el.getAttribute("data-i18n-prop-ids");
    const tag = v.el.tagName?.toLowerCase();
    // Match both the propId and element tag for precision
    const baseElement = element.split("[")[0];
    if (ids && ids.split(";").includes(propId) && tag === baseElement) {
      return v.el;
    }
  }

  // Recurse into component subTree
  if (v.component?.subTree) {
    const found = findElByPropId(v.component.subTree, propId, element);
    if (found) return found;
  }

  // Recurse into children array
  if (Array.isArray(v.children)) {
    for (const child of v.children) {
      const found = findElByPropId(child, propId, element);
      if (found) return found;
    }
  }

  return null;
}

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

      // Fragment recovery — decode payload to extract propId + element
      const payload = (() => {
        try {
          return decodePayload(ourBinding.value);
        } catch {
          return [];
        }
      })();

      // Extract propId + element from Traced entries
      type TracedWithPropId = {
        type: string;
        propId?: string;
        element?: string;
      };

      const tracedEntries = payload
        .filter((e) => e.type === "traced")
        .map((e) => e as unknown as TracedWithPropId)
        .filter((e) => Boolean(e.propId && e.element));

      if (tracedEntries.length > 0) {
        // Walk the vnode subtree to find the exact element by propId + tag
        for (const entry of tracedEntries) {
          const targetEl = findElByPropId(
            instance.subTree,
            entry.propId!,
            entry.element!,
          );

          if (targetEl && !targetEl.hasAttribute("data-i18n-studio")) {
            directiveDef.mounted(
              targetEl as I18nHTMLElement,
              { value: ourBinding.value, instance: ourBinding.instance },
              instance.vnode as unknown as VNode,
            );
            break;
          }
        }
        return;
      }

      // Fallback: no propId — use original first-child recovery
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
