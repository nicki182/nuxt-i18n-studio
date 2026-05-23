import type { AssignmentExpression } from "estree";

import type { ScriptResolver } from "../../types";

import { resolveExpression } from "./resolveExpression";

/**
 * Resolves an assignment expression (e.g., greeting = t('home'))
 * Passes the right side of the assignment to the expression evaluator.
 *
 * @param root0
 * @param root0.node
 * @param root0.source
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
