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
 * Harvests return values from a CallExpression node, specifically handling the `defineProps` function in Vue.js.
 * It supports both TypeScript generic forms and runtime object/array forms of `defineProps`.
 * @param node The CallExpression node to harvest from.
 * @returns { ReturnHarvestedValue | undefined } An array of harvested return values, or undefined if the call is not to `defineProps`.
 */
export function harvestFromCallExpression(
  node: CallExpression,
): ReturnHarvestedValue | undefined {
  if (
    node.callee.type !== "Identifier" ||
    (node.callee as Identifier).name !== "defineProps"
  )
    return;

  const results: ReturnHarvestedValue = [];

  // ── TypeScript generic form: defineProps<{ prop: Type; ... }>() ───────────
  // acorn-typescript puts the type argument on node.typeArguments (NOT typeParameters)
  // as a TSTypeParameterInstantiation. Its .params[0] is a TSTypeLiteral whose
  // .members are TSPropertySignature nodes — one per declared prop.
  const typeArgs = (
    node as unknown as {
      typeArguments?: {
        type: string;
        params?: Array<{
          type: string;
          members?: Array<{
            type: string;
            key?: { type: string; name?: string; value?: unknown };
          }>;
        }>;
      };
    }
  ).typeArguments;

  if (typeArgs?.params?.length) {
    const firstParam = typeArgs.params[0];
    if (
      firstParam?.type === "TSTypeLiteral" &&
      Array.isArray(firstParam.members)
    ) {
      for (const member of firstParam.members) {
        if (member?.type !== "TSPropertySignature" || !member.key) continue;
        const propName =
          member.key.type === "Identifier"
            ? member.key.name
            : member.key.type === "Literal"
              ? String(member.key.value)
              : null;
        if (propName) {
          results.push({ name: propName, value: "__PROP__", isProp: true });
        }
      }
    }
  }

  // If the TS generic form produced results, return early —
  // it's mutually exclusive with the runtime argument forms.
  if (results.length) return results;

  // ── Runtime object form: defineProps({ titleKey: String, ... }) ───────────
  const arg = node.arguments[0] as Expression | undefined;
  if (!arg) return results;

  if (arg.type === "ObjectExpression") {
    (arg as ObjectExpression).properties.forEach(
      (prop: Property | SpreadElement) => {
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

  // ── Runtime array form: defineProps(['titleKey', 'otherKey']) ─────────────
  if (arg.type === "ArrayExpression") {
    (arg as ArrayExpression).elements.forEach((el) => {
      if (!el || el.type !== "Literal") return;
      const literal = el as Literal;
      if (typeof literal.value === "string") {
        results.push({ name: literal.value, value: "__PROP__", isProp: true });
      }
    });
  }

  return results;
}
