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
  PropKeyMap,
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

export function transformTemplateElement(
  scriptVariableMap: ScriptVariableMap,
  templateVariableMap: TemplateVariableMap,
  propKeyMap: PropKeyMap,
): NodeTransform {
  return (node) => {
    if (node.type !== NodeTypes.ELEMENT) return;
    const el = node as WrappableElementNode;

    if (el.__i18nWrapped) return;
    if (el.tagType === 2 || el.tagType === 3) return;

    const payloadEntries: PayloadEntry[] = [];

    // ── Phase 4: Component usage site injection (propKeyMap) ─────────────────
    // If this element is a component and we have a pre-resolved prop map for it,
    // inject keys directly here — in the parent template, which is always
    // compiled after the child. Handles N-level-deep prop chains.
    if (el.tagType === 1 && el.tag && propKeyMap.has(el.tag)) {
      const componentPropMap = propKeyMap.get(el.tag)!;

      for (const propNode of el.props) {
        if (propNode.type !== NodeTypes.DIRECTIVE) continue;
        const prop = propNode as DirectiveNode;
        if (prop.name !== "bind" || !prop.exp) continue;

        const propName =
          prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION
            ? (prop.arg as SimpleExpressionNode).content
            : null;

        if (!propName) continue;

        const resolvedKeys = componentPropMap.get(propName);
        if (!resolvedKeys?.length) continue;

        for (const key of resolvedKeys) {
          payloadEntries.push({
            type: KeyExtractionType.Static,
            key,
            id: `__STATIC__${key}`,
            usageType: `prop:${propName}`,
          });
        }
      }

      if (payloadEntries.length > 0) {
        el.__i18nWrapped = true;
        const [directiveNode, idAttrNode] = injectDirective(payloadEntries);
        el.props.push(directiveNode, idAttrNode);
        return;
      }
    }

    // ── Native element phases ─────────────────────────────────────────────────

    const source = el.loc?.source ?? "";
    const hasTCall =
      source.includes("$t") || source.includes(" t(") || source.includes("(t(");
    const hasDeclaredKeys = source.includes(DECLARED_KEYS_ATTR);
    const hasTemplateRef = hasTemplateVariableRef(el, templateVariableMap);

    if (!hasTCall && !hasDeclaredKeys && !hasTemplateRef) return;

    // ── Phase 1: Explicit developer declarations ──────────────────────────────
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
            payloadEntries.push({ ...entry, usageType: "text:dynamic" });
          }
        }

        // Plain identifier that calls t() in the script
        // e.g. {{ title }} where const title = computed(() => t('home.title'))
        for (const entry of templateVariableMap.get(expression) ?? []) {
          payloadEntries.push({
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
          payloadEntries.push({ ...entry, usageType: `attr:${attrName}` });
        }
      }

      // :placeholder="label" where label = computed(() => t(...))
      // Uses BARE_IDENTIFIER_RE to handle whitespace in expressions
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
    const [directiveNode, idAttrNode] = injectDirective(payloadEntries);
    el.props.push(directiveNode, idAttrNode);
  };
}
