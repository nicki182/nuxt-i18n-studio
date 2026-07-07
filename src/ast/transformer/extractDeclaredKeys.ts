import type { PayloadEntry, WrappableElementNode } from "@ast/types";

import { KeyExtractionType, DECLARED_KEYS_ATTR } from "@ast/constants";
import { NodeTypes, type AttributeNode } from "@vue/compiler-dom";

/**
 * Extracts declared translation keys from a given ElementNode's attributes.
 * @param el - The ElementNode to extract declared keys from.
 * @returns {PayloadEntry[]} representing the extracted declared translation keys.
 */
export function extractDeclaredKeys(
  el: WrappableElementNode,
): PayloadEntry[] {
  const declaredAttr = el.props.find(
        (p): p is AttributeNode =>
          p.type === NodeTypes.ATTRIBUTE && p.name === DECLARED_KEYS_ATTR,
      );
      const entries: PayloadEntry[] = [];
      if (declaredAttr?.value?.content) {
        declaredAttr.value.content
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
          .forEach((key) => {
            entries.push({
              type: KeyExtractionType.Static,
              key,
              id: `__STATIC__${key}`,
              usageType: "declared",
            });
          });
      }
      return entries;
}
