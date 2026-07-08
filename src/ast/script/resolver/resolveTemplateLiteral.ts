import type { TemplateLiteral } from "estree";

import type { ScriptResolver } from "../../types";

/**
 * Resolves a TemplateLiteral node to an array of ScriptResolver objects.
 * @param args An object containing the TemplateLiteral node and the raw source code.
 * @param args.node The TemplateLiteral node to resolve.
 * @param args.source The raw source code of the script, which may be used for context or fallback values.
 * @returns { ScriptResolver[] } An array of ScriptResolver objects representing the resolved translation keys.
 */
export function resolveTemplateLiteral(args: {
  node: TemplateLiteral;
  source: string;
}): ScriptResolver[] {
  const { node } = args;
  if (node.expressions.length === 0) {
    const key = node.quasis.map((q) => q.value.cooked).join("");
    return [{ type: "direct", key, id: `__STATIC__${key}` }];
  }
  const prefix = node.quasis[0]?.value?.cooked ?? "";
  if (prefix) {
    return [{ type: "prefix", prefix, id: `__PREFIX__${prefix}` }];
  }
  return [];
}
