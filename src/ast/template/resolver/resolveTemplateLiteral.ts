import type { TemplateLiteral } from "estree";

import type { ExtractedKey, ScriptVariableMap } from "../../types";

import { KeyExtractionType } from "../../constants";

/**
 * Resolves a TemplateLiteral node to extract potential i18n keys.
 * @param args An object containing the TemplateLiteral node and a map of script variables.
 * @param args.node The TemplateLiteral node to resolve.
 * @param args.valueMap A map of script variables that can be used to resolve identifiers to their values.
 * @returns An array of extracted keys, where each key is an object containing the resolved value and associated metadata.
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
