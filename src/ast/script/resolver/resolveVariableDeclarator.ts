import type { VariableDeclarator } from "estree";

import type { ScriptResolver } from "../../types";

import { resolveExpression } from "./resolveExpression";

/**
 *
 * @param root0
 * @param root0.node
 * @param root0.source
 */
export function resolveVariableDeclarator({
  node,
  source,
}: {
  node: VariableDeclarator;
  source: string;
}): ScriptResolver[] {
  const decl = node as VariableDeclarator;
  if (decl.id.type !== "Identifier") return [];
  if (!decl.init) return [];

  return resolveExpression({ node: decl.init, source });
}
