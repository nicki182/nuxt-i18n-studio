import type {
  CallExpression,
  ConditionalExpression,
  LogicalExpression,
  Literal,
  TemplateLiteral,
} from "estree";

import type { ScriptResolver } from "../../types";

import { resolveLiteral } from "./resolveLiteral";
import { resolveTemplateLiteral } from "./resolveTemplateLiteral";

export function resolveCallExpression(
  node: CallExpression,
  source: string,
): ScriptResolver[] {
  const firstArg = node.arguments[0];
  if (!firstArg) return [];

  if (
    firstArg.type === "Literal" &&
    typeof (firstArg as Literal).value === "string"
  ) {
    return resolveLiteral({ node: firstArg as Literal });
  }

  if (firstArg.type === "TemplateLiteral") {
    return resolveTemplateLiteral({
      node: firstArg as TemplateLiteral,
      source,
    });
  }

  if (firstArg.type === "ConditionalExpression") {
    const cond = firstArg as ConditionalExpression;
    const tempNodeA = {
      ...node,
      arguments: [cond.consequent],
    } as CallExpression;
    const tempNodeB = {
      ...node,
      arguments: [cond.alternate],
    } as CallExpression;

    return [
      ...resolveCallExpression(tempNodeA, source),
      ...resolveCallExpression(tempNodeB, source),
    ];
  }

  if (firstArg.type === "LogicalExpression") {
    const log = firstArg as LogicalExpression;
    const tempNodeA = {
      ...node,
      arguments: [log.left],
    } as CallExpression;
    const tempNodeB = {
      ...node,
      arguments: [log.right],
    } as CallExpression;

    return [
      ...resolveCallExpression(tempNodeA, source),
      ...resolveCallExpression(tempNodeB, source),
    ];
  }

  const argStart = (firstArg as any).start;
  const argEnd = (firstArg as any).end;
  const expr = source.slice(argStart, argEnd);

  return [{ type: "dynamic", expr, id: `__EXPR__${expr}` }];
}
