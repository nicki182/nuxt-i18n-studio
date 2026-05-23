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

export function nodeResolver(args: {
  node: ScriptResolvableNode | null | undefined;
  source: string;
}): ScriptResolver[] {
  const { node } = args;
  if (!node) return [];

  const resolver =
    getNodeTypeResolver[node.type as keyof typeof getNodeTypeResolver];
  if (!resolver) return [];

  return resolver({ ...args });
}
