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
 * Resolves an ESTree node to extract potential i18n keys, handling various node types such as literals, identifiers, conditionals, logical expressions, call expressions, and template literals. It uses a mapping of node types to specific resolver functions that implement the logic for each type. If the node type is not recognized or if the node is null/undefined, it returns an empty array.
 * @param args An object containing the node to resolve, the raw source code (for context), and a map of script variables for identifier resolution.
 * @param args.node The ESTree node to resolve, which can be of various types including Literal, Identifier, ConditionalExpression, LogicalExpression, CallExpression, TemplateLiteral, Expression, SpreadElement, or undefined/null.
 * @param args.rawSource The raw source code of the script, which may be used by resolvers for context or fallback values.
 * @param args.valueMap A map of script variables that can be used to resolve identifiers to their values.
 * @returns An array of extracted keys, where each key is an object containing the resolved value and associated metadata.
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

  return resolver(args);
}
