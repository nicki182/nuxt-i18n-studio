import { NodeTypes, type AttributeNode } from "@vue/compiler-dom";

import type { WrappableElementNode } from "../types";

import { KeyExtractionType, DECLARED_KEYS_ATTR } from "../constants";

export function extractDeclaredKeys(
  el: WrappableElementNode,
) {
  const declaredAttr = el.props.find(
        (p): p is AttributeNode =>
          p.type === NodeTypes.ATTRIBUTE && p.name === DECLARED_KEYS_ATTR,
      );
      const entries = [];
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
