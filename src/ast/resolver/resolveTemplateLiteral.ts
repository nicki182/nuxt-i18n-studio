import type { ExtractedKey, ValueMap } from "../types";

export function resolveTemplateLiteral(args: {
  node: any;
  valueMap: ValueMap;
}): ExtractedKey[] {
  const { node } = args;
  if (node.expressions.length === 0) {
    const full = node.quasis.map((q: any) => q.value.cooked).join("");
    if (full) {
      return [{ type: "static", key: full, id: `__STATIC__${full}` }];
    }
  }
  const prefix = node.quasis[0]?.value?.cooked;
  if (prefix) {
    return [{ type: "prefix", prefix, id: `__PREFIX__${prefix}` }];
  }
  return [];
}
