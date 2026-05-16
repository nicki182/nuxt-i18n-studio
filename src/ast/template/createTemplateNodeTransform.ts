// ast/index.ts — add this export
import type { ASTPlugin, ScriptVariableMap } from "../types";

import { transformTemplateElement } from "./transformTemplateElement";

export function createTemplateNodeTransform(vitePlugin: ASTPlugin) {
  return (node, context) => {
    const fileId: string = context?.filename || "";
    const valueMap: ScriptVariableMap =
      vitePlugin._valueMapCache.get(fileId) ?? new Map<string, string[]>();
    transformTemplateElement(valueMap)(node, context);
  };
}
