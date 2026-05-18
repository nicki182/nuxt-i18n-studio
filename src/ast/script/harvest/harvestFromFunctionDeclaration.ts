import type { FunctionDeclaration } from "estree";

import type { ReturnHarvestedValue } from "../../types";

import { harvestFunctionReturns } from "./harvestFromFunctionReturns";

/**
 *
 * @param node
 */
export function harvestFromFunctionDeclaration(
  node: FunctionDeclaration,
): ReturnHarvestedValue | undefined {
  if (!node.id) return;
  return harvestFunctionReturns(node, node.id.name);
}
