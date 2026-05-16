import type { ReturnHarvestedValue } from "../../types";

import { harvestLiterals } from "./harvestFromLiterals";

export function harvestFromAssignmentExpression(
  node: any,
): ReturnHarvestedValue | undefined {
  if (
    node.left?.type === "MemberExpression" &&
    node.left.object?.type === "Identifier" &&
    node.left.property?.name === "value"
  ) {
    return harvestLiterals(node.right, node.left.object.name);
  }
  if (node.left?.type === "Identifier") {
    return harvestLiterals(node.right, node.left.name);
  }
}
