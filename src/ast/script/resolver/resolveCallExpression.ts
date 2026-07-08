import type { ScriptResolver } from "@ast/types";
import type {
  CallExpression,
  ConditionalExpression,
  LogicalExpression,
  Literal,
  TemplateLiteral,
} from "estree";

import { KeyExtractionType } from "../../constants";
import { resolveLiteral } from "./resolveLiteral";
import { resolveTemplateLiteral } from "./resolveTemplateLiteral";

/**
 * Resolves a CallExpression node to an array of ScriptResolver objects.
 * @param node The CallExpression node to resolve.
 * @param source The raw source code of the script, which may be used for context or fallback values.
 * @returns { ScriptResolver[] } An array of ScriptResolver objects representing the resolved translation keys.
 */
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
    return [
      ...resolveCallExpression({ ...node, arguments: [cond.consequent] } as CallExpression, source),
      ...resolveCallExpression({ ...node, arguments: [cond.alternate] } as CallExpression, source),
    ];
  }

  if (firstArg.type === "LogicalExpression") {
    const log = firstArg as LogicalExpression;
    return [
      ...resolveCallExpression({ ...node, arguments: [log.left] } as CallExpression, source),
      ...resolveCallExpression({ ...node, arguments: [log.right] } as CallExpression, source),
    ];
  }

  const { start, end } = firstArg as unknown as { start: number; end: number };
  const expr = source.slice(start, end);

  return [{ type: KeyExtractionType.Dynamic, expr, id: `__EXPR__${expr}` }];
}
