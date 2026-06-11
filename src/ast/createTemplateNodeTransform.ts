import path from "node:path";
import type { NodeTransform } from "@vue/compiler-dom";
import type { ASTPlugin, ScriptVariableMap, TemplateVariableMap } from "./types";
import { transformTemplateElement } from "./transformTemplateElement";

function toPascalCase(filename: string): string {
  return filename
    .replace(/[-_](.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (_, c: string) => c.toUpperCase());
}

export function createTemplateNodeTransform(plugin: ASTPlugin): NodeTransform {
  return (node, context) => {
    const fileId: string = context?.filename ?? "";

    const scriptVariableMap: ScriptVariableMap =
      plugin._valueMapCache.get(fileId) ?? new Map<string, string[]>();

    const templateVariableMap: TemplateVariableMap =
      plugin._templateMapCache.get(fileId) ?? new Map();

    const propKeyMap = plugin._propKeyMap ?? new Map();
    const componentInitialIndex = plugin._componentInitialIndex ?? new Map();

    const basename = path.basename(fileId, ".vue");
    const currentComponentName = toPascalCase(basename);

    transformTemplateElement(
      scriptVariableMap,
      templateVariableMap,
      propKeyMap,
      componentInitialIndex,
      currentComponentName,
    )(node, context);
  };
}
