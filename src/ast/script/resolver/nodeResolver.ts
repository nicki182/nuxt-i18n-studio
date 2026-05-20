import type {
  ResolverMapScript,
  ScriptResolver,
  ScriptResolvableNode,
} from "../../types";

import { resolveFunction } from "./resolveFunction";
import { resolveVariableDeclarator } from "./resolveVariableDeclarator";

// Only node types that can wrap a t() call internall

const getNodeTypeResolver: ResolverMapScript = {
  VariableDeclarator: resolveVariableDeclarator,
  FunctionDeclaration: resolveFunction,
};

/**
 * Resolves a script-side ESTree node to extract variables and functions
 * that call t() / $t() internally. Used by mapScriptTranslations to build
 * the TemplateVariableMap.
 *
 * Only handles VariableDeclarator and FunctionDeclaration — other node types
 * return an empty array.
 * @param args
 * @param args.node - The ESTree node to resolve
 * @param args.source - The raw script source code, used to slice argument positions
 */
export function nodeResolver(args: {
  node: ScriptResolvableNode | null | undefined;
  source: string; // raw script source — not "rawSource", this isn't an expression
}): ScriptResolver[] {
  const { node } = args;
  if (!node) return [];

  const resolver =
    getNodeTypeResolver[node.type as keyof typeof getNodeTypeResolver];
  if (!resolver) return [];

  return resolver({ ...args });
}
