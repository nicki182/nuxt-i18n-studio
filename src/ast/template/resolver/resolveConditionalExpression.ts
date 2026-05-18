import type { ConditionalExpression } from "estree";

import type { ExtractedKey, ScriptVariableMap } from "../../types";

import { nodeResolver } from "./nodeResolver";

/**
 * Resolves a ConditionalExpression node by extracting keys from both the consequent and alternate branches.
 * @param args An object containing the ConditionalExpression node, the raw source code, and a map of script variables.
 * @param args.node The ConditionalExpression node to resolve.
 * @param args.rawSource The raw source code of the script, which may be used for context or fallback values.
 * @param args.valueMap A map of script variables that can be used to resolve identifiers to their values.
 * @returns An array of extracted keys, where each key is an object containing the resolved value and associated metadata.
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
