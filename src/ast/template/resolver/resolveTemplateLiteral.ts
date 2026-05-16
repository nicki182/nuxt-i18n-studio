import type { TemplateLiteral } from "estree";

import {
  KeyExtractionType,
  type ExtractedKey,
  type ScriptVariableMap,
} from "../../types";

/**
 *
 * @param args
 * @param args.node
 * @param args.valueMap
 */
export function resolveTemplateLiteral(args: {
  node: TemplateLiteral;
  valueMap: ScriptVariableMap;
}): ExtractedKey[] {
  const { node } = args;
  if (node.expressions.length === 0) {
    const full = node.quasis.map((q) => q.value.cooked).join("");
    if (full) {
      return [
        { type: KeyExtractionType.Static, key: full, id: `__STATIC__${full}` },
      ];
    }
  }
  const prefix = node.quasis[0]?.value?.cooked;
  if (prefix) {
    return [
      { type: KeyExtractionType.Prefix, prefix, id: `__PREFIX__${prefix}` },
    ];
  }
  return [];
}
