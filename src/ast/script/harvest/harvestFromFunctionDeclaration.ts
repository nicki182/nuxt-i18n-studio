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
  // FunctionDeclaration.id is Identifier | null
  // (null only in default exports: export default function() {})
  // We only care about named functions since we need the name for the map
  if (!node.id) return;
  return harvestFunctionReturns(node, node.id.name);
}
