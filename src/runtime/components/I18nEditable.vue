<script lang="ts">
import { cloneVNode } from "vue";

import { useStudioState } from "../composables/useStudioState";

export default defineComponent({
  name: "I18nEditable",
  props: {
    translationKey: { type: String, required: true },
    translatableAttrs: { type: String, default: "" }, // JSON array of { attr, key }
  },
  setup(props, { slots }) {
    // 1. Use our internal singleton state instead of Nuxt injections
    const { isStudioMode } = useStudioState();

    // 2. Keep the openModal injection (since your UI component provides this)
    const openModal =
      inject<
        (
          translations: { key: string; usages: string[] }[],
          el: HTMLElement,
        ) => void
      >("i18n-open-modal");

    const elRef = ref<HTMLElement | ComponentPublicInstance | null>(null);

    const getDOMElement = (): HTMLElement | null => {
      const raw = elRef.value;
      if (!raw) return null;
      // If it's a Vue component instance, extract the root DOM element
      if ("$el" in raw) {
        return raw.$el as HTMLElement;
      }
      // Otherwise it's already an HTMLElement
      return raw as HTMLElement;
    };

    const buildTranslations = (): { key: string; usages: string[] }[] => {
      const map = new Map<string, Set<string>>();

      // 1. Add attribute usages first (they take priority)
      if (props.translatableAttrs) {
        const attrList = JSON.parse(props.translatableAttrs) as {
          attr: string;
          key: string;
        }[];
        attrList.forEach(({ attr, key }) => {
          if (!map.has(key)) map.set(key, new Set());
          map.get(key)!.add(`attr:${attr}`);
        });
      }

      // 2. Add text usages only if the key doesn't already have any attr usage
      props.translationKey
        .split(",")
        .filter(Boolean)
        .forEach((k) => {
          if (!map.has(k)) {
            // No attribute usage for this key yet, so add as plain text
            map.set(k, new Set<string>());
            map.get(k)!.add("text");
          }
        });

      return Array.from(map.entries()).map(([key, usages]) => ({
        key,
        usages: Array.from(usages),
      }));
    };

    const blockAndOpen = (e: Event) => {
      // 3. Check our composable state
      if (!isStudioMode.value) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (e.type === "click") {
        const translations = buildTranslations();
        openModal?.(
          translations,
          getDOMElement() || (e.currentTarget as HTMLElement),
        );
      }
    };

    const toggleListeners = (add: boolean) => {
      const el = getDOMElement();
      if (!el) return;
      const method = add ? "addEventListener" : "removeEventListener";
      const opts = { capture: true };
      ["click", "mousedown", "mouseup", "submit"].forEach((event) => {
        el[method](event, blockAndOpen, opts);
      });
    };

    // 4. Watch our composable state
    watch(
      () => isStudioMode.value,
      (active) => toggleListeners(!!active),
    );

    onMounted(() => {
      if (isStudioMode.value) toggleListeners(true);
    });

    onUnmounted(() => toggleListeners(false));

    return () => {
      const children = slots.default?.();
      if (!children || children.length === 0) return null;

      const vnode = children.find(
        (n) => n.type !== Symbol.for("v-fgt") && n.type !== Symbol.for("v-cmt"),
      ) as VNode;

      if (!vnode) return children;

      return cloneVNode(vnode, {
        ref: elRef,
        "data-i18n-key": props.translationKey,
        class: [vnode.props?.class, "i18n-studio-node"],
      });
    };
  },
});
</script>

<style>
.i18n-studio-active .i18n-studio-node {
  outline: 1px dashed rgba(59, 130, 246, 0.4) !important;
  cursor: context-menu !important;
  user-select: none !important;
}
.i18n-studio-active .i18n-studio-node:hover {
  outline: 2px solid #3b82f6 !important;
  background: rgba(59, 130, 246, 0.05) !important;
}
.i18n-frozen *:not(#i18n-studio-ui-root):not(#i18n-studio-ui-root *) {
  animation-play-state: paused !important;
  transition: none !important;
}
</style>
