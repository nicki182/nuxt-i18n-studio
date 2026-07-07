import type { NodeTransform } from "@vue/compiler-dom";

import { toPascalCase } from "@utils";
import path from "node:path";

import type { ASTPlugin, ScriptVariableMap, TemplateVariableMap } from "./types";

import { createI18nTransformer } from './transformer';

/**
 * Creates a Vue AST node transform function that processes template nodes for i18n translation keys.
 * It utilizes the provided ASTPlugin to access script and template variable maps, as well as component prop mappings.
 * @param plugin - The ASTPlugin instance containing necessary mappings and caches.
 * @returns {NodeTransform} - A Vue AST node transformer function.
 */
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

    createI18nTransformer(
      scriptVariableMap,
      templateVariableMap,
      propKeyMap,
      componentInitialIndex,
      currentComponentName,
    )(node, context);
  };
}
