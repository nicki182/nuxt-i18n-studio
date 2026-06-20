import type { TemplateLiteral } from "estree";

import type { ScriptResolver } from "../../types";

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
