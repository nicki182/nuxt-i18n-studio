import type {
  CallExpression,
  Expression,
  Identifier,
  Literal,
  ObjectExpression,
  ArrayExpression,
  Property,
  SpreadElement,
} from "estree";

import type { ReturnHarvestedValue } from "../../types";

/**
 * Harvests return values from a CallExpression, specifically targeting defineProps calls.
 * @param node The CallExpression node to harvest from.
 * @returns The harvested return value, or undefined if not applicable.
 */
export function harvestFromCallExpression(
  node: CallExpression,
): ReturnHarvestedValue | undefined {
  // callee is Expression | Super — narrow to Identifier for name check
  if (
    node.callee.type !== "Identifier" ||
    (node.callee as Identifier).name !== "defineProps"
  )
    return;

  const results: ReturnHarvestedValue = [];
  const arg = node.arguments[0] as Expression | undefined;
  if (!arg) return results;

  // defineProps({ titleKey: String, ... })
  if (arg.type === "ObjectExpression") {
    (arg as ObjectExpression).properties.forEach(
      (prop: Property | SpreadElement) => {
        // Skip spread elements — ...rest has no static key
        if (prop.type === "SpreadElement") return;

        const key = (prop as Property).key;
        const propName =
          key.type === "Identifier"
            ? (key as Identifier).name
            : key.type === "Literal"
              ? String((key as Literal).value)
              : null;

        if (propName) {
          results.push({ name: propName, value: "__PROP__", isProp: true });
        }
      },
    );
  }

  // defineProps(['titleKey', 'otherKey'])
  if (arg.type === "ArrayExpression") {
    (arg as ArrayExpression).elements.forEach((el) => {
      // elements can be Expression | SpreadElement | null (sparse arrays)
      if (!el || el.type !== "Literal") return;
      const literal = el as Literal;
      if (typeof literal.value === "string") {
        results.push({ name: literal.value, value: "__PROP__", isProp: true });
      }
    });
  }

  return results;
}
