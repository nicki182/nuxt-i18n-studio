import type { FunctionDeclaration } from "estree";

import type { ReturnHarvestedValue } from "../../types";

import { harvestFunctionReturns } from "./harvestFromFunctionReturns";

/**
 * Harvests return values from a FunctionDeclaration node by delegating to harvestFunctionReturns.
 * @param node The FunctionDeclaration node to harvest from.
 * @returns { ReturnHarvestedValue | undefined } An array of harvested return values, or undefined if the function has no identifier.
 */
export function harvestFromFunctionDeclaration(
  node: FunctionDeclaration,
): ReturnHarvestedValue | undefined {
  if (!node.id) return;
  return harvestFunctionReturns(node, node.id.name);
}
