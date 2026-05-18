import type { LogicalExpression } from "estree";

import type { ExtractedKey, ScriptVariableMap } from "../../types";

import { nodeResolver } from "./nodeResolver";
/**
 * Resolves a LogicalExpression node by extracting keys from both the left and right branches.
 * @param args An object containing the LogicalExpression node, the raw source code, and a map of script variables.
 * @param args.node The LogicalExpression node to resolve.
 * @param args.rawSource The raw source code of the script, which may be used for context or fallback values.
 * @param args.valueMap A map of script variables that can be used to resolve identifiers to their values.
 * @returns An array of extracted keys, where each key is an object containing the resolved value and associated metadata.
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
