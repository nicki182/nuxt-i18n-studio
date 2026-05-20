import type { NodeTransform } from "@vue/compiler-dom";

import type {
  ASTPlugin,
  ScriptVariableMap,
  TemplateVariableMap,
} from "./types";

import { transformTemplateElement } from "./transformTemplateElement";

/**
 * Wires both Vite plugin caches to the Vue compiler node transform.
 * Both caches are populated during the Vite transform() hook and read
 * here by context.filename.
 * @param plugin
 */
export function createTemplateNodeTransform(plugin: ASTPlugin): NodeTransform {
  return (node, context) => {
    const fileId: string = context?.filename ?? "";

    const scriptVariableMap: ScriptVariableMap =
      plugin._valueMapCache.get(fileId) ?? new Map<string, string[]>();

    const templateVariableMap: TemplateVariableMap =
      plugin._templateMapCache.get(fileId) ?? new Map();

    transformTemplateElement(scriptVariableMap, templateVariableMap)(
      node,
      context,
    );
  };
}
