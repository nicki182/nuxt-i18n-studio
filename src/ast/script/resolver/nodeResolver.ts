import type {
  ResolverMapScript,
  ScriptResolver,
  ScriptResolvableNode,
} from "../../types";

import { resolveFunction } from "./resolveFunction";
import { resolveAssignmentExpression } from "./resolverAssignmentExpression";
import { resolveVariableDeclarator } from "./resolveVariableDeclarator";

const getNodeTypeResolver: ResolverMapScript = {
  VariableDeclarator: resolveVariableDeclarator,
  FunctionDeclaration: resolveFunction,
  AssignmentExpression: resolveAssignmentExpression,
};

/**
 * Resolves a script node to an array of ScriptResolver objects based on its type.
 * @param args An object containing the script node and the raw source code.
 * @param args.node The script node to resolve (VariableDeclarator, FunctionDeclaration, or AssignmentExpression).
 * @param args.source The raw source code of the script, which may be used for context or fallback values.
 * @returns { ScriptResolver[] } An array of ScriptResolver objects representing the resolved translation keys.
 */
export function nodeResolver(args: {
  node: ScriptResolvableNode | null | undefined;
  source: string;
}): ScriptResolver[] {
  const { node } = args;
  if (!node) return [];

  const resolver =
    getNodeTypeResolver[node.type as keyof typeof getNodeTypeResolver];
  if (!resolver) return [];

  return (resolver as (args: { node: ScriptResolvableNode; source: string }) => ScriptResolver[])(
    { ...args, node }
  );
}
