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
  ComponentInitialIndex,
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
  componentInitialIndex: ComponentInitialIndex,
  currentComponentName: string,
): NodeTransform {
  return (node) => {
    if (node.type !== NodeTypes.ELEMENT) return;
    const el = node as WrappableElementNode;

    if (el.__i18nWrapped) return;
    if (el.tagType === 2 || el.tagType === 3) return;

    const payloadEntries: PayloadEntry[] = [];

    // ── Phase 0: Inject data-i18n-prop-ids on native elements ────────────────
    // Fires when compiling a component that is a componentEnd in propKeyMap.
    // Injects all candidate ids onto the matching native element tag.
    // e.g. HeaderAppPage.vue <h1> → data-i18n-prop-ids="hap__header__0;hap__header__1;..."
    if (el.tagType === 0 && el.tag) {
      const componentPropMap = propKeyMap.get(currentComponentName);

      if (componentPropMap) {
        const propIds: string[] = [];

        for (const [, entry] of componentPropMap) {
          const baseElement = entry.element.split("[")[0];
          if (baseElement !== el.tag) continue;

          for (const candidate of entry.candidates) {
            if (candidate.componentEnd === currentComponentName) {
              propIds.push(candidate.id);
            }
          }
        }

        if (propIds.length > 0) {
          const propIdsAttr = {
            type: NodeTypes.ATTRIBUTE,
            name: "data-i18n-prop-ids",
            value: {
              type: NodeTypes.TEXT,
              content: propIds.join(";"),
              loc: el.loc,
            },
            loc: el.loc,
          } as AttributeNode;

          el.props.push(propIdsAttr);
          // Don't return — native element may still have its own $t() calls
        }
      }
    }

    // ── Phase 4: Component usage site injection ───────────────────────────────
    // Fires when compiling a parent that uses a component tracked in
    // componentInitialIndex. O(1) lookup: componentInitialIndex[el.tag][propName]
    // → [{ propId, element, componentEnd }]
    if (el.tagType === 1 && el.tag) {

      const initialPropMap = componentInitialIndex.get(el.tag);

      if (initialPropMap) {
        for (const propNode of el.props) {
          if (propNode.type !== NodeTypes.DIRECTIVE) continue;
          const prop = propNode as DirectiveNode;
          if (prop.name !== "bind" || !prop.exp) continue;

          const propName =
            prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION
              ? (prop.arg as SimpleExpressionNode).content
              : null;
          if (!propName) continue;

          const lookupEntries = initialPropMap.get(propName);
          if (!lookupEntries?.length) continue;

          const expression = prop.exp.loc?.source?.trim();
          if (!expression) continue;

          const expressionKeys = extractKeysFromExpression(
            expression,
            scriptVariableMap,
          );
          if (node.tag === "HeaderAppPage" || node.tag === "HeaderAppPageEvent")
          console.log(
            "Phase 4 →",
            el.tag,
            propName,
            "| expression:",
            expression,
            "| keys:",
            expressionKeys,
            "| lookupEntries:",
            lookupEntries?.map((e) => e.propId),
          );
          if (expressionKeys.length === 0) continue;

          for (const key of expressionKeys) {
            // Find the matching lookup entry for this key
            // Look up the full candidate from propKeyMap to get the key
            for (const lookupEntry of lookupEntries) {
              const propEntry = propKeyMap
                .get(lookupEntry.componentEnd)
                ?.get(propName);
              if (!propEntry) continue;

              const candidate = propEntry.candidates.find(
                (c) => c.id === lookupEntry.propId && c.key === key,
              );
              if (node.tag === "HeaderAppPage" || node.tag === "HeaderAppPageEvent")
              console.log(
                "Candidate match attempt:",
                lookupEntry.propId,
                key,
                "→",
                candidate ? "FOUND" : "NOT FOUND",
                "available keys:",
                propEntry.candidates.map((c) => c.key).slice(0, 3),
              );
              if (!candidate) continue;

              payloadEntries.push({
                type: KeyExtractionType.Traced,
                key: candidate.key,
                allCandidates: [{ key: candidate.key }],
                id: `__TRACED__${propName}__${candidate.id}`,
                propId: candidate.id,
                element: lookupEntry.element,
                usageType: `prop:${propName}`,
              } as PayloadEntry & { propId: string; element: string });
            }
          }
        }

        if (payloadEntries.length > 0) {
          el.__i18nWrapped = true;
          const [directiveNode, idAttrNode] = injectDirective(payloadEntries);
          el.props.push(directiveNode, idAttrNode);
          return;
        }
      }
    }

    // ── Native element phases ─────────────────────────────────────────────────

    const source = el.loc?.source ?? "";
    const hasTCall =
      source.includes("$t") || source.includes(" t(") || source.includes("(t(");
    const hasDeclaredKeys = source.includes(DECLARED_KEYS_ATTR);
    const hasTemplateRef = hasTemplateVariableRef(el, templateVariableMap);

    if (!hasTCall && !hasDeclaredKeys && !hasTemplateRef) return;

    // ── Phase 1: Explicit developer -declarations ──────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractKeysFromExpression(
  expression: string,
  scriptVariableMap: ScriptVariableMap,
): string[] {
  const keys: string[] = [];
  for (const entry of extractTemplateTranslations(
    expression,
    scriptVariableMap,
  )) {
    if ("key" in entry && entry.key) keys.push(entry.key);
    if ("allCandidates" in entry) {
      (entry.allCandidates as { key: string }[]).forEach((c) => {
        if (c.key) keys.push(c.key);
      });
    }
  }
  return [...new Set(keys)];
}
