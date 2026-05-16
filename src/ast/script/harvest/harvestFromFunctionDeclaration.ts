// harvestFromFunctionDeclaration.ts
import type { ReturnHarvestedValue } from "../../types";

import { harvestFunctionReturns } from "./harvestFromFunctionReturns";

export function harvestFromFunctionDeclaration(
  node: any,
): ReturnHarvestedValue | undefined {
  const name = node.id?.name;
  if (!name) return;
  return harvestFunctionReturns(node, name);
}
