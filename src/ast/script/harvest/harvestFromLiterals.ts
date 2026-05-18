import type {
  BlockStatement,
  ConditionalExpression,
  Expression,
  Literal,
  LogicalExpression,
  ReturnStatement,
  TemplateLiteral,
} from "estree";

import type { ReturnHarvestedValue } from "../../types";

/**
 * Harvests string literals from various expression types, including conditionals and templates.
 * @param node The AST node to harvest from, which can be a Literal, ConditionalExpression, LogicalExpression, TemplateLiteral, ReturnStatement, BlockStatement, or any Expression.
 * @param name The name to associate with harvested values (e.g., variable or function name).
 * @returns An array of harvested return values, each containing the string value and associated name.
 */
export function harvestLiterals(
  node:
    | Literal
    | ConditionalExpression
    | LogicalExpression
    | TemplateLiteral
    | ReturnStatement
    | BlockStatement
    | Expression,
  name: string,
): ReturnHarvestedValue {
  if (!node) return [] as ReturnHarvestedValue;

  if (node.type === "Literal" && typeof node.value === "string") {
    return [{ value: node.value, name }];
  }

  if (node.type === "ConditionalExpression") {
    return [
      ...harvestLiterals(node.consequent as ConditionalExpression, name),
      ...harvestLiterals(node.alternate as ConditionalExpression, name),
    ] as ReturnHarvestedValue;
  }

  if (node.type === "LogicalExpression") {
    return [
      ...harvestLiterals(node.left as LogicalExpression, name),
      ...harvestLiterals(node.right as LogicalExpression, name),
    ] as ReturnHarvestedValue;
  }

  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    const full = node.quasis.map((q) => q.value.cooked).join("");
    return full ? [{ value: full, name }] : ([] as ReturnHarvestedValue);
  }

  return [] as ReturnHarvestedValue;
}
