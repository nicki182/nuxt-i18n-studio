import type { ResolverMap, ScriptVariableMap, ExtractedKey, ResolvableNode } from "@ast/types";
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
 * Resolves a node to an array of ExtractedKey objects based on its type.
 * @param args An object containing the node to resolve, the raw source code, and a map of script variables.
 * @param args.node The node to resolve, which can be of various types.
 * @param args.rawSource The raw source code of the script, which may be used for context or fallback values.
 * @param args.valueMap A map of script variables that can be used to resolve function names to their values.
 * @returns { ExtractedKey[] } An array of extracted keys, where each key is an object containing the resolved value and associated metadata.
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

  const resolver =
    getNodeTypeResolver[node.type as keyof typeof getNodeTypeResolver];
  if (!resolver) return [];

  // Cast to ResolverArgs<ResolvableNode> — safe because we've already confirmed
  // node.type matches the resolver key, and each resolver only reads its own node type
  return (resolver as (args: { node: ResolvableNode; rawSource: string; valueMap: ScriptVariableMap }) => ExtractedKey[])(
    { ...args, node: node as ResolvableNode }
  );
}
