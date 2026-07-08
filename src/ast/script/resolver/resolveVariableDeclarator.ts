import type { VariableDeclarator } from "estree";

import type { ScriptResolverArgs, ScriptResolver } from "../../types";

import { resolveExpression } from "./resolveExpression";

/**
 * Resolves a VariableDeclarator node to an array of ScriptResolver objects.
 * @param args An object containing the VariableDeclarator node and the raw source code.
 * @param args.node The VariableDeclarator node to resolve.
 * @param args.source The raw source code of the script, which may be used for context or fallback values.
 * @returns { ScriptResolver[] } An array of ScriptResolver objects representing the resolved translation keys.
 */
export function resolveVariableDeclarator(
  args: ScriptResolverArgs<VariableDeclarator>,
): ScriptResolver[] {
  const { node, source } = args;

  if (node.id.type !== "Identifier") return [];
  if (!node.init) return [];

  const resolved = resolveExpression({ node: node.init, source });

  return resolved;
}
