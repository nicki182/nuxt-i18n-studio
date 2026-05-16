import type { NodeTransform } from "@vue/compiler-dom";

import type { ASTPlugin, ScriptVariableMap } from "../types";

import { transformTemplateElement } from "./transformTemplateElement";

/**
 * Wires the Vite plugin's per-file ScriptVariableMap cache to the Vue
 * compiler node transform. The cache is populated during the Vite transform
 * hook and read here by context.filename.
 * @param vitePlugin
 */
export function createTemplateNodeTransform(
  vitePlugin: ASTPlugin,
): NodeTransform {
  return (node, context) => {
    const fileId: string = context?.filename ?? "";
    const valueMap: ScriptVariableMap =
      vitePlugin._valueMapCache.get(fileId) ?? new Map<string, string[]>();
    transformTemplateElement(valueMap)(node, context);
  };
}
