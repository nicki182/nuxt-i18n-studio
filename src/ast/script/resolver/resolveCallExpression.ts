import type { CallExpression } from "estree";

import type { ScriptResolver } from "../../types";

/**
 *
 * @param node
 * @param source
 */
export function resolveCallExpression(
  node: CallExpression,
  source: string,
): ScriptResolver | null {
  const firstArg = node.arguments[0];
  if (!firstArg) return null;

  // t('home.title') — direct string literal
  if (
    firstArg.type === "Literal" &&
    typeof (firstArg as { value: unknown }).value === "string"
  ) {
    const key = (firstArg as { value: string }).value;
    return { type: "direct", key, id: `__STATIC__${key}` };
  }

  // t(`home.${type}`) — template literal with static prefix
  if (firstArg.type === "TemplateLiteral") {
    const tmpl = firstArg as {
      expressions: unknown[];
      quasis: { value: { cooked: string } }[];
    };

    if (tmpl.expressions.length === 0) {
      // Fully static template literal
      const key = tmpl.quasis.map((q) => q.value.cooked).join("");
      return { type: "direct", key, id: `__STATIC__${key}` };
    }

    const prefix = tmpl.quasis[0]?.value?.cooked ?? "";
    if (prefix) {
      return { type: "prefix", prefix, id: `__PREFIX__${prefix}` };
    }
  }

  // t(someVar) or t(getKey()) — dynamic, extract raw source
  const argStart = (firstArg as unknown as { start: number }).start;
  const argEnd = (firstArg as unknown as { end: number }).end;
  const expr = source.slice(argStart, argEnd);

  return { type: "dynamic", expr, id: `__EXPR__${expr}` };
}
