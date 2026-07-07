import type {
  ArrowFunctionExpression,
  CallExpression,
  Expression,
  FunctionExpression,
  Identifier,
  MemberExpression,
} from "estree";

import type { ScriptResolver } from "../../types";

import { isTCall } from "../helper";
import { resolveCallExpression } from "./resolveCallExpression";
import { resolveFunction } from "./resolveFunction";

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
    calls.push(...resolveCallExpression(node as CallExpression, source));
    return calls;
  }

  // props.header or $props.header — emit a prop entry so the template
  // transform can inject directly on the element that renders this variable
  if (node.type === "MemberExpression") {
    const member = node as MemberExpression;
    if (
      (!member.computed &&
        member.object.type === "Identifier" &&
        (member.object as Identifier).name === "props") ||
      (member.object.type === "Identifier" &&
        (member.object as Identifier).name === "$props")
    ) {
      if (member.property.type === "Identifier") {
        const propName = (member.property as Identifier).name;
        return [
          {
            type: "prop" as const,
            propName,
            id: `__PROP__${propName}` as `__PROP__${string}`,
          },
        ];
      }
    }
  }

  // computed(() => t('home.title')) or computed(() => props.header) — unwrap the callback
  if (
    node.type === "CallExpression" &&
    (node as CallExpression).callee.type === "Identifier"
  ) {
    const callExpr = node as CallExpression;
    const calleeName = (callExpr.callee as Identifier).name;

    if (["computed", "watchEffect"].includes(calleeName)) {
      const firstArg = callExpr.arguments[0];
      if (firstArg) {
        calls.push(
          ...resolveExpression({ node: firstArg as Expression, source }),
        );
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
