import type {
  AssignmentExpression,
  Identifier,
  MemberExpression,
} from "estree";

import type { ReturnHarvestedValue } from "../../types";

import { harvestLiterals } from "./harvestFromLiterals";

/**
 *
 * @param node
 */
export function harvestFromAssignmentExpression(
  node: AssignmentExpression,
): ReturnHarvestedValue | undefined {
  // key.value = '...' — ref assignment pattern
  // AssignmentExpression.left is Pattern (not Expression), which includes
  // MemberExpression. We narrow step by step to avoid unsafe property access.
  if (node.left.type === "MemberExpression") {
    const member = node.left as MemberExpression;

    if (
      member.object.type === "Identifier" &&
      !member.computed && // exclude key[value] — only key.value
      member.property.type === "Identifier" &&
      (member.property as Identifier).name === "value"
    ) {
      const objectName = (member.object as Identifier).name;
      return harvestLiterals(node.right, objectName);
    }
  }

  // key = '...' — plain assignment
  if (node.left.type === "Identifier") {
    return harvestLiterals(node.right, (node.left as Identifier).name);
  }
}
