import type {
  NodeTransform,
  ElementNode,
  DirectiveNode,
  InterpolationNode,
} from "@vue/compiler-dom";

import { NodeTypes } from "@vue/compiler-dom";

import type { ValueMap, PayloadEntry } from "./types";

import { extractI18nArguments } from "./extractI18nArguments";

export function buildNodeTransform(valueMap: ValueMap): NodeTransform {
  return (node) => {
    if (node.type !== NodeTypes.ELEMENT) return;
    const el = node as ElementNode;

    if ((el as ElementNode & { __i18nWrapped?: boolean }).__i18nWrapped) return;
    // Skip slots (2) and template tags (3)
    if (el.tagType === 2 || el.tagType === 3) return;

    // Quick bail — no t() calls in this element's source
    const source = el.loc?.source || "";
    if (
      !source.includes("$t") &&
      !source.includes(" t(") &&
      !source.includes("(t(")
    )
      return;

    const payloadEntries: PayloadEntry[] = [];

    // 1. Inner text interpolations: {{ $t('key') }} or {{ $t(dynamicKey) }}
    for (const childNode of el.children) {
      if (childNode.type !== NodeTypes.INTERPOLATION) continue;
      const interp = childNode as InterpolationNode;
      const expression = interp.content?.loc?.source;
      if (expression) {
        for (const entry of extractI18nArguments(expression, valueMap)) {
          payloadEntries.push({ ...entry, usageType: "text:dynamic" });
        }
      }
    }

    // 2. Bound attributes: :placeholder="$t('key')" | :aria-label="$t(...)"
    for (const propNode of el.props) {
      if (propNode.type !== NodeTypes.DIRECTIVE) continue;
      const prop = propNode as DirectiveNode;
      if (prop.name !== "bind" || !prop.exp) continue;
      const attrName =
        prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION
          ? prop.arg.content
          : "unknown";
      const expression = prop.exp.loc?.source;
      if (expression) {
        for (const entry of extractI18nArguments(expression, valueMap)) {
          payloadEntries.push({ ...entry, usageType: `attr:${attrName}` });
        }
      }
    }

    if (payloadEntries.length === 0) return;
    (el as ElementNode & { __i18nWrapped?: boolean }).__i18nWrapped = true;

    // Base64 encode so Vue's compiler never chokes on special characters.
    // CRITICAL: wrap in quotes so Vue emits a string literal into the render
    // function, not a bare identifier. Without quotes, SSR crashes with
    // "W3sidHlw..." is not defined" because it looks like a JS variable name.
    const quotedPayload = `'${btoa(JSON.stringify(payloadEntries))}'`;

    const locStub = {
      source: quotedPayload,
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 0, line: 1, column: 1 },
    };

    el.props.push({
      type: NodeTypes.DIRECTIVE,
      name: "i18n-studio",
      modifiers: [],
      exp: {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: quotedPayload,
        // Always static — the string never changes, only what the directive
        // does with it at runtime. Avoids unnecessary Vue re-evaluation.
        isStatic: true,
        constType: 3, // ConstantTypes.CAN_STRINGIFY
        loc: locStub,
      },
      loc: locStub,
    } as unknown as DirectiveNode);
  };
}
