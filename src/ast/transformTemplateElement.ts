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
  TemplateVariableMap,
  WrappableElementNode,
} from "./types";

import {
  KeyExtractionType,
  DECLARED_KEYS_ATTR,
  BARE_IDENTIFIER_RE,
} from "./constants";
import { injectDirective, hasTemplateVariableRef } from "./helper";
import { extractScriptTranslations } from "./script/extractScriptTranslations";
import { extractTemplateTranslations } from "./template/extractTemplateTranslations";

/**
 * Returns a Vue compiler NodeTransform that injects v-i18n-studio directive
 * payloads into elements containing:
 *  - $t() / t() calls (existing)
 *  - data-i18n-keys declarations (existing)
 *  - Plain variable references that call t() in the script (new)
 * @param scriptVariableMap
 * @param templateVariableMap
 */
export function transformTemplateElement(
  scriptVariableMap: ScriptVariableMap,
  templateVariableMap: TemplateVariableMap,
): NodeTransform {
  return (node) => {
    if (node.type !== NodeTypes.ELEMENT) return;
    const el = node as WrappableElementNode;

    if (el.__i18nWrapped) return;
    if (el.tagType === 2 || el.tagType === 3) return;

    const source = el.loc?.source ?? "";
    const hasTCall =
      source.includes("$t") || source.includes(" t(") || source.includes("(t(");
    const hasDeclaredKeys = source.includes(DECLARED_KEYS_ATTR);

    if (
      !hasTCall &&
      !hasDeclaredKeys &&
      !hasTemplateVariableRef(el, templateVariableMap)
    )
      return;

    const payloadEntries: PayloadEntry[] = [];

    // ── 1. Explicit developer declarations ───────────────────────────────────
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

    // ── 2. Interpolations ─────────────────────────────────────────────────────
    for (const childNode of el.children) {
      if (childNode.type === NodeTypes.INTERPOLATION) {
        const interp = childNode as InterpolationNode;
        const expression = interp.content?.loc?.source;
        if (!expression) continue;

        if (hasTCall) {
          // Standard $t() extraction
          for (const entry of extractTemplateTranslations(
            expression,
            scriptVariableMap,
          )) {
            payloadEntries.push({ ...entry, usageType: "text:dynamic" });
          }
        }

        // Phase 2: plain identifier that calls t() in the script
        // e.g. {{ title }} where const title = computed(() => t('home.title'))
        const bareMatch = expression.match(BARE_IDENTIFIER_RE);
        if (bareMatch?.[1]) {
          const identifierName = bareMatch[1];
          for (const entry of extractScriptTranslations(
            identifierName,
            templateVariableMap,
          )) {
            payloadEntries.push({
              ...entry,
              usageType: "text:script-ref",
              // Store which script variable this came from for traceability
              scriptRef: identifierName,
            } as PayloadEntry & { scriptRef: string });
          }
        }
      }

      // Compound expressions like {{ foo + bar }} — skip for now,
      // too complex to safely extract individual identifier references
    }

    // ── 3. Bound attributes ───────────────────────────────────────────────────
    for (const propNode of el.props) {
      if (propNode.type !== NodeTypes.DIRECTIVE) continue;
      const prop = propNode as DirectiveNode;
      if (prop.name !== "bind" || !prop.exp) continue;

      const attrName =
        prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION
          ? (prop.arg as SimpleExpressionNode).content
          : "unknown";

      const expression = prop.exp.loc?.source;
      if (!expression) continue;

      if (hasTCall) {
        for (const entry of extractTemplateTranslations(
          expression,
          scriptVariableMap,
        )) {
          payloadEntries.push({ ...entry, usageType: `attr:${attrName}` });
        }
      }

      // Phase 2: :placeholder="label" where label = computed(() => t(...))
      const bareMatch = expression.match(BARE_IDENTIFIER_RE);
      if (bareMatch?.[1]) {
        const identifierName = bareMatch[1];
        for (const entry of extractScriptTranslations(
          identifierName,
          templateVariableMap,
        )) {
          payloadEntries.push({
            ...entry,
            usageType: `attr:${attrName}`,
            scriptRef: identifierName,
          } as PayloadEntry & { scriptRef: string });
        }
      }
    }

    if (payloadEntries.length === 0) return;
    el.__i18nWrapped = true;
    const directive = injectDirective(payloadEntries);
    el.props.push(directive);
  };
}
