import type {
  NodeTransform,
  DirectiveNode,
  InterpolationNode,
  SimpleExpressionNode,
  AttributeNode,
} from "@vue/compiler-dom";

import { NodeTypes } from "@vue/compiler-dom";

import type {
  ScriptVariableMap,
  PayloadEntry,
  WrappableElementNode,
} from "../types";

import { KeyExtractionType, DECLARED_KEYS_ATTR } from "../constants";
import { injectDirective } from "../helper";
import { extractTemplateTranslations } from "./extractTemplateTranslations";
/**
 * Returns a Vue compiler NodeTransform that injects a v-i18n-studio
 * directive payload into every element containing $t() calls.
 * The payload is a base64-encoded JSON string containing an array of
 * translation keys extracted from that element's text and bound attributes.
 * The directive is injected at the end of the transform chain, after all
 * other transformations and optimizations, to ensure the payload is intact
 * and easily accessible at runtime.
 * @param valueMap A map of script variables that can be used to resolve identifiers to their values during key extraction.
 * @returns A NodeTransform function to be used in the Vue compiler.
 */
export function transformTemplateElement(
  valueMap: ScriptVariableMap,
): NodeTransform {
  return (node) => {
    if (node.type !== NodeTypes.ELEMENT) return;
    const el = node as WrappableElementNode;

    if (el.__i18nWrapped) return;
    // Skip slots (tagType 2) and <template> tags (tagType 3)
    if (el.tagType === 2 || el.tagType === 3) return;

    // Quick bail — no $t calls AND no declared keys on this element
    const source = el.loc?.source ?? "";
    const hasTCall =
      source.includes("$t") || source.includes(" t(") || source.includes("(t(");
    const hasDeclaredKeys = source.includes(DECLARED_KEYS_ATTR);

    if (!hasTCall && !hasDeclaredKeys) return;

    const payloadEntries: PayloadEntry[] = [];

    // ── 1. Explicit developer declarations (highest priority) ─────────────────
    // data-i18n-keys="home.key.one,home.key.two"
    // Replaces eval-based resolution for prop and dynamic entries.
    const declaredAttr = el.props.find(
      (p): p is AttributeNode =>
        p.type === NodeTypes.ATTRIBUTE && p.name === DECLARED_KEYS_ATTR,
    );

    if (declaredAttr?.value?.content) {
      declaredAttr.value.content
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
        .forEach((key) => {
          payloadEntries.push({
            type: KeyExtractionType.Static,
            key,
            id: `__STATIC__${key}`,
            usageType: "declared",
          });
        });
    }

    if (!hasTCall) {
      // Element only has data-i18n-keys — no $t calls to extract
      if (payloadEntries.length === 0) return;
      el.__i18nWrapped = true;
      const directive = injectDirective(payloadEntries);
      el.props.push(directive);
      return;
    }

    // ── 2. Inner text interpolations: {{ $t('key') }} | {{ $t(dynamicKey) }} ──
    for (const childNode of el.children) {
      if (childNode.type !== NodeTypes.INTERPOLATION) continue;
      const interp = childNode as InterpolationNode;
      const expression = interp.content?.loc?.source;
      if (expression) {
        for (const entry of extractTemplateTranslations(expression, valueMap)) {
          payloadEntries.push({ ...entry, usageType: "text:dynamic" });
        }
      }
    }

    // ── 3. Bound attributes: :placeholder="$t('key')" | :aria-label="$t(...)" ─
    for (const propNode of el.props) {
      if (propNode.type !== NodeTypes.DIRECTIVE) continue;
      const prop = propNode as DirectiveNode;
      if (prop.name !== "bind" || !prop.exp) continue;

      const attrName =
        prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION
          ? (prop.arg as SimpleExpressionNode).content
          : "unknown";

      const expression = prop.exp.loc?.source;
      if (expression) {
        for (const entry of extractTemplateTranslations(expression, valueMap)) {
          payloadEntries.push({ ...entry, usageType: `attr:${attrName}` });
        }
      }
    }

    if (payloadEntries.length === 0) return;
    el.__i18nWrapped = true;
    const directive = injectDirective(payloadEntries);
    el.props.push(directive);
  };
}
