import type {
  Expression,
  CallExpression,
  ArrowFunctionExpression,
  FunctionExpression,
  FunctionDeclaration,
  Node,
  ReturnStatement,
} from "estree";

import { walk } from "zimmerframe";

import type { ScriptResolver } from "../../types";

import { isTCall } from "../helper";
import { resolveCallExpression } from "./resolveCallExpression";

/**
 *
 * @param root0
 * @param root0.node
 * @param root0.source
 */
export function resolveFunction({
  node,
  source,
}: {
  node: ArrowFunctionExpression | FunctionExpression | FunctionDeclaration;
  source: string;
}): ScriptResolver[] {
  const calls: ScriptResolver[] = [];
  const body = node.body;
  if (!body) return calls;

  // Implicit arrow return: () => t('home.foo')
  if (body.type !== "BlockStatement") {
    if (isTCall(body)) {
      const call = resolveCallExpression(body as CallExpression, source);
      if (call) calls.push(...call);
    }
    return calls;
  }

  // Block body — walk for return statements and direct t() calls
  walk(body, calls, {
    _(node: Node, { state: calls, next }) {
      next();

      if (node.type === "ReturnStatement") {
        const ret = node as ReturnStatement;
        if (ret.argument && isTCall(ret.argument)) {
          const call = resolveCallExpression(
            ret.argument as CallExpression,
            source,
          );
          if (call) calls.push(...call);
        }
        return;
      }

      // Direct t() call as expression statement inside the function
      if (node.type === "ExpressionStatement") {
        const expr = (node as { expression: Expression }).expression;
        if (isTCall(expr)) {
          const call = resolveCallExpression(expr as CallExpression, source);
          if (call) calls.push(...call);
        }
      }
    },
  });

  return calls;
}
