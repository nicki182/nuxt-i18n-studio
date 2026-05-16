import type { ExtractedKey } from "../../types";

export function resolveLiteral(args: { node: any }): ExtractedKey[] {
  const { node } = args;
  if (typeof node.value === "string" && node.value) {
    return [{ type: "static", key: node.value, id: `__STATIC__${node.value}` }];
  }
  return [];
}
