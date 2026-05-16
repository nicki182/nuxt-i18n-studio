import type { ExtractedKey, ValueMap } from "../types";

export function resolveLogicalExpression(args:{
  node: any,
  rawSource: string,
  valueMap: ValueMap,
  resolver: (args: {node: any, rawSource: string, valueMap: ValueMap}) => ExtractedKey[]
}): ExtractedKey[] {
  const { node, rawSource, valueMap, resolver } = args;
  const valuesL = resolver({node: node.left, rawSource, valueMap});
  const valuesR = resolver({node: node.right, rawSource, valueMap});
  return [...valuesL, ...valuesR];
}
