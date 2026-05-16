import type { ReturnHarvestedValue } from "../../types";

export function harvestLiterals(node: any, name: string): ReturnHarvestedValue {
  if (!node) return [] as ReturnHarvestedValue;

  if (node.type === "Literal" && typeof node.value === "string") {
    return [{ value: node.value, name }];
  }

  if (node.type === "ConditionalExpression") {
    return [
      ...harvestLiterals(node.consequent, name),
      ...harvestLiterals(node.alternate, name),
    ] as ReturnHarvestedValue;
  }

  if (node.type === "LogicalExpression") {
    return [
      ...harvestLiterals(node.left, name),
      ...harvestLiterals(node.right, name),
    ] as ReturnHarvestedValue;
  }

  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    const full = node.quasis.map((q: any) => q.value.cooked).join("");
    return full ? [{ value: full, name }] : ([] as ReturnHarvestedValue);
  }

  return [] as ReturnHarvestedValue;
}
