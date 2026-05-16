import type { Node } from "estree";

import type { ReturnHarvestedValue, HarvesterMap } from "../../types";

import { harvestFromAssignmentExpression } from "./harvestFromAssignmentExpression";
import { harvestFromCallExpression } from "./harvestFromCallExpression";
import { harvestFromFunctionDeclaration } from "./harvestFromFunctionDeclaration";
import { harvestFromVariableDeclarator } from "./harvestFromVariableDeclarator";

const nodeTypeToHarvester: HarvesterMap = {
  VariableDeclarator: harvestFromVariableDeclarator,
  AssignmentExpression: harvestFromAssignmentExpression,
  CallExpression: harvestFromCallExpression,
  FunctionDeclaration: harvestFromFunctionDeclaration,
};

/**
 * Main entry point to harvest values from a node based on its type. It looks up
 * the appropriate harvester function from the map and invokes it with the node.
 * If no harvester is defined for the node type, it returns an empty array.
 * Each harvester function is responsible for checking if the node matches the
 * expected pattern and returning harvested values or undefined if not applicable.
 *
 * @param node - The ESTree node to harvest values from
 * @returns An array of harvested values extracted from the node, or empty if none found
 */
export function harvestValuesByNodeType(node: Node): ReturnHarvestedValue {
  const harvester = nodeTypeToHarvester[node.type];
  if (!harvester) return [];
  const result = (
    harvester as (node: Node) => ReturnHarvestedValue | undefined
  )(node);
  return result ?? [];
}
