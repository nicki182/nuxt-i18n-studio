import type { ConditionalExpression } from "estree";

import type { ExtractedKey, ScriptVariableMap } from "../../types";

import { nodeResolver } from "./nodeResolver";

/**
 *
 * @param args
 * @param args.node
 * @param args.rawSource
 * @param args.valueMap
 */
export function resolveConditionalExpression(args: {
  node: ConditionalExpression;
  rawSource: string;
  valueMap: ScriptVariableMap;
}): ExtractedKey[] {
  const { node, rawSource, valueMap } = args;
  const valuesC = nodeResolver({ node: node.consequent, rawSource, valueMap });
  const valuesA = nodeResolver({ node: node.alternate, rawSource, valueMap });
  return [...valuesC, ...valuesA];
}
