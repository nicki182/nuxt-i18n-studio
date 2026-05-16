import type { ReturnHarvestedValue } from "../../types";

import { harvestFromAssignmentExpression } from "./harvestFromAssignmentExpression";
import { harvestFromCallExpression } from "./harvestFromCallExpression";
import { harvestFromFunctionDeclaration } from "./harvestFromFunctionDeclaration";
import { harvestFromVariableDeclarator } from "./harvestFromVariableDeclarator";

const nodeTypeToHarvester: Record<
  string,
  (node: any) => ReturnHarvestedValue | undefined
> = {
  VariableDeclarator: harvestFromVariableDeclarator,
  AssignmentExpression: harvestFromAssignmentExpression,
  CallExpression: harvestFromCallExpression,
  FunctionDeclaration: harvestFromFunctionDeclaration,
};

export function harvestValuesByNodeType(node: any): ReturnHarvestedValue {
  const harvester = nodeTypeToHarvester[node.type];
  if (!harvester) return [];
  const result = harvester(node);
  return result || [];
}
