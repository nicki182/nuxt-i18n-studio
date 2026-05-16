// ast/index.ts — add this export
import type { ASTPlugin, ValueMap } from "./types";

import { buildNodeTransform } from "./buildNodeTransform";

export function createNodeTransform(vitePlugin: ASTPlugin) {
  return (node, context) => {
    const fileId: string = context?.filename || "";
    const valueMap: ValueMap =
      vitePlugin._valueMapCache.get(fileId) ?? new Map<string, string[]>();
    buildNodeTransform(valueMap)(node, context);
  };
}
