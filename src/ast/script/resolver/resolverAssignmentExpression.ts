import type { AssignmentExpression } from "estree";

import type { ScriptResolver } from "../../types";

import { resolveExpression } from "./resolveExpression";

/**
 * Resolves an AssignmentExpression node to an array of ScriptResolver objects.
 * @param args An object containing the AssignmentExpression node and the raw source code.
 * @param args.node The AssignmentExpression node to resolve.
 * @param args.source The raw source code of the script, which may be used for context or fallback values.
 * @returns { ScriptResolver[] } An array of ScriptResolver objects representing the resolved translation keys.
 */
export function resolveAssignmentExpression({
  node,
  source,
}: {
  node: AssignmentExpression;
  source: string;
}): ScriptResolver[] {
  // node.right is whatever is on the right side of the `=` sign
  return resolveExpression({ node: node.right, source });
}
