import type { LogicalExpression } from "estree";

import type { ExtractedKey, ScriptVariableMap } from "../../types";

import { nodeResolver } from "./nodeResolver";
/**
 *
 * @param args
 * @param args.node
 * @param args.rawSource
 * @param args.valueMap
 */
export function resolveLogicalExpression(args: {
  node: LogicalExpression;
  rawSource: string;
  valueMap: ScriptVariableMap;
}): ExtractedKey[] {
  const { node, rawSource, valueMap } = args;
  const valuesL = nodeResolver({ node: node.left, rawSource, valueMap });
  const valuesR = nodeResolver({ node: node.right, rawSource, valueMap });
  return [...valuesL, ...valuesR];
}
