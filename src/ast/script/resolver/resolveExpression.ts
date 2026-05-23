import type {
  ArrowFunctionExpression,
  CallExpression,
  Expression,
  FunctionExpression,
  Identifier,
} from "estree";

import type { ScriptResolver } from "../../types";

import { isTCall } from "../../helper";
import { resolveCallExpression } from "./resolveCallExpression";
import { resolveFunction } from "./resolveFunction";

/**
 *
 * @param root0
 * @param root0.node
 * @param root0.source
 */
export function resolveExpression({
  node,
  source,
}: {
  node: Expression | null | undefined;
  source: string;
}): ScriptResolver[] {
  if (!node) return [];

  const calls: ScriptResolver[] = [];
  // Direct t() call: const title = t('home.title')
  if (isTCall(node)) {
    const callArray = resolveCallExpression(node as CallExpression, source);
    calls.push(...callArray);
    return calls;
  }

  // computed(() => t('home.title')) — unwrap the callback
  if (
    node.type === "CallExpression" &&
    (node as CallExpression).callee.type === "Identifier"
  ) {
    const callExpr = node as CallExpression;
    const calleeName = (callExpr.callee as Identifier).name;

    // Vue composables that wrap a callback: computed, watchEffect, etc.
    if (["computed", "watchEffect"].includes(calleeName)) {
      const firstArg = callExpr.arguments[0];
      if (firstArg) {
        // Guaranteed fix: pass it recursively so the ArrowFunction block below catches it!
        calls.push(...resolveExpression({ node: firstArg as Expression, source }));
      }
      return calls;
    }
  }

  // Arrow or function expression: const getLabel = (type) => t('home.label')
  if (
    node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionExpression"
  ) {
    calls.push(
      ...resolveFunction({
        node: node as ArrowFunctionExpression | FunctionExpression,
        source,
      }),
    );
    return calls;
  }

  return calls;
}
