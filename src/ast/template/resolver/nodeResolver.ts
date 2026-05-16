import type { ValueMap, ExtractedKey } from "../../types";

import { resolveCallExpression } from "./resolveCallExpression";
import { resolveConditionalExpression } from "./resolveConditionalExpression";
import { resolveIdentifier } from "./resolveIdentifier";
import { resolveLiteral } from "./resolveLiteral";
import { resolveLogicalExpression } from "./resolveLogicalExpression";
import { resolveTemplateLiteral } from "./resolveTemplateLiteral";

const getNodeTypeResolver = {
  Literal: resolveLiteral,
  Identifier: resolveIdentifier,
  ConditionalExpression: resolveConditionalExpression,
  LogicalExpression: resolveLogicalExpression,
  CallExpression: resolveCallExpression,
  TemplateLiteral: resolveTemplateLiteral,
};

export function nodeResolver(args: {
  node: any;
  rawSource: string;
  valueMap: ValueMap;
}): ExtractedKey[] {
  const { node } = args;
  if (!node) return [];

  const resolver = getNodeTypeResolver[node.type];
  if (resolver) {
    return resolver({
      ...args,
      resolver: nodeResolver,
    });
  }
  return [];
}
