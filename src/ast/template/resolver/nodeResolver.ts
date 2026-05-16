import type {
  CallExpression,
  ConditionalExpression,
  Identifier,
  Literal,
  LogicalExpression,
  TemplateLiteral,
  Expression,
  SpreadElement,
} from "estree";

import type { ResolverMap, ScriptVariableMap, ExtractedKey } from "../../types";

import { resolveCallExpression } from "./resolveCallExpression";
import { resolveConditionalExpression } from "./resolveConditionalExpression";
import { resolveIdentifier } from "./resolveIdentifier";
import { resolveLiteral } from "./resolveLiteral";
import { resolveLogicalExpression } from "./resolveLogicalExpression";
import { resolveTemplateLiteral } from "./resolveTemplateLiteral";

const getNodeTypeResolver: ResolverMap = {
  Literal: resolveLiteral,
  Identifier: resolveIdentifier,
  ConditionalExpression: resolveConditionalExpression,
  LogicalExpression: resolveLogicalExpression,
  CallExpression: resolveCallExpression,
  TemplateLiteral: resolveTemplateLiteral,
};

/**
 *
 * @param args
 * @param args.node
 * @param args.rawSource
 * @param args.valueMap
 */
export function nodeResolver(args: {
  node:
    | Literal
    | Identifier
    | ConditionalExpression
    | LogicalExpression
    | CallExpression
    | TemplateLiteral
    | Expression
    | SpreadElement
    | undefined
    | null;
  rawSource: string;
  valueMap: ScriptVariableMap;
}): ExtractedKey[] {
  const { node } = args;
  if (!node) return [];

  const resolver = getNodeTypeResolver[node.type];
  if (!resolver) return [];

  return resolver(args);
}
