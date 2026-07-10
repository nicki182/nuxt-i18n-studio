import {
  NodeTypes,
  type InterpolationNode,
  type DirectiveNode,
  type SimpleExpressionNode,
} from "@vue/compiler-dom";

import type {
  WrappableElementNode,
  PayloadEntry,
  ScriptVariableMap,
  TemplateVariableMap,
} from "../types";

import { DECLARED_KEYS_ATTR, BARE_IDENTIFIER_RE } from "../constants";
import { extractScriptTranslations } from "../script/extractScriptTranslations";
import { extractTemplateTranslations } from "../template/extractTemplateTranslations";
import { hasTemplateVariableRef } from "./helper";

/**
 * Extracts translation keys from a given ElementNode, including text interpolations and bound attributes.
 * @param el - The ElementNode to extract translations from.
 * @param scriptVariableMap - A map of script variable references.
 * @param templateVariableMap - A map of template variable references.
 * @returns {PayloadEntry[]}  representing the extracted translation keys.
 */
export function extractInFileTranslations(
  el: WrappableElementNode,
  scriptVariableMap: ScriptVariableMap,
  templateVariableMap: TemplateVariableMap,
): PayloadEntry[] {
  const entries: PayloadEntry[] = [];

  const source = el.loc?.source ?? "";
  const hasTCall =
    source.includes("$t") || source.includes(" t(") || source.includes("(t(");
  const hasDeclaredKeys = source.includes(DECLARED_KEYS_ATTR);
  const hasTemplateRef = hasTemplateVariableRef(el, templateVariableMap);
  if (!hasTCall && !hasDeclaredKeys && !hasTemplateRef) return entries;

  // ── Phase 2: Interpolations ───────────────────────────────────────────────
  for (const childNode of el.children) {
    if (childNode.type === NodeTypes.INTERPOLATION) {
      const interp = childNode as InterpolationNode;
      const expression = interp.content?.loc?.source;
      if (!expression) continue;

      if (hasTCall) {
        for (const entry of extractTemplateTranslations(
          expression,
          scriptVariableMap,
        )) {
          entries.push({ ...entry, usageType: "text:dynamic" });
        }
      }

      for (const entry of templateVariableMap.get(expression) ?? []) {
        entries.push({
          ...entry,
          usageType: "text:script-ref",
          scriptRef: expression,
        } as PayloadEntry & { scriptRef: string });
      }
    }
  }

  // ── Phase 3: Bound attributes ─────────────────────────────────────────────
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
        entries.push({ ...entry, usageType: `attr:${attrName}` });
      }
    }

    const bareMatch = expression.match(BARE_IDENTIFIER_RE);
    if (bareMatch?.[1]) {
      const identifierName = bareMatch[1];
      for (const entry of extractScriptTranslations(
        identifierName,
        templateVariableMap,
      )) {
        entries.push({
          ...entry,
          usageType: `attr:${attrName}`,
          scriptRef: identifierName,
        } as PayloadEntry & { scriptRef: string });
      }
    }
  }

  return entries;
}
