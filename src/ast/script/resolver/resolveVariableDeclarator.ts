import type { VariableDeclarator } from "estree";

import type { ScriptResolverArgs, ScriptResolver } from "../../types";

import { resolveExpression } from "./resolveExpression";

export function resolveVariableDeclarator(
  args: ScriptResolverArgs<VariableDeclarator>,
): ScriptResolver[] {
  const { node, source } = args;

  if (node.id.type !== "Identifier") return [];
  if (!node.init) return [];

  const resolved = resolveExpression({ node: node.init, source });

  return resolved;
}
