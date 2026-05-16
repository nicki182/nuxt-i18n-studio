import type { ExtractedKey, ValueMap } from "../../types";

export function resolveConditionalExpression(args: {
  node: any;
  rawSource: string;
  valueMap: ValueMap;
  resolver: (args: {
    node: any;
    rawSource: string;
    valueMap: ValueMap;
  }) => ExtractedKey[];
}): ExtractedKey[] {
  const { node, rawSource, valueMap, resolver } = args;
  const valuesC = resolver({ node: node.consequent, rawSource, valueMap });
  const valuesA = resolver({ node: node.alternate, rawSource, valueMap });
  return [...valuesC, ...valuesA];
}
