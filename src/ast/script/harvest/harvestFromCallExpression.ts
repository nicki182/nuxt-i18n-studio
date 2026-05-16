// harvestFromCallExpression.ts
import type { ReturnHarvestedValue } from "../../types";

// harvestFromCallExpression.ts
export function harvestFromCallExpression(
  node: any,
): ReturnHarvestedValue | undefined {
  if (node.callee?.name !== "defineProps") return;

  const results: ReturnHarvestedValue = [];
  const arg = node.arguments[0];

  if (arg?.type === "ObjectExpression") {
    arg.properties.forEach((prop: any) => {
      const propName = prop.key?.name || prop.key?.value;
      if (propName)
        results.push({ name: propName, value: "__PROP__", isProp: true });
    });
  }

  if (arg?.type === "ArrayExpression") {
    arg.elements.forEach((el: any) => {
      if (el?.type === "Literal" && typeof el.value === "string") {
        results.push({ name: el.value, value: "__PROP__", isProp: true });
      }
    });
  }

  return results;
}
