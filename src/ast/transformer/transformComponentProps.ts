import type {
  WrappableElementNode,
  ComponentInitialIndex,
  PropKeyMap,
  ScriptVariableMap,
  PayloadEntry,
} from "@ast/types";
import type {
  DirectiveNode,
  AttributeNode,
  SimpleExpressionNode,
} from "@vue/compiler-dom";

import { KeyExtractionType } from "@ast/constants";
import { extractKeys } from "@ast/helper";
import { toPascalCase } from "@utils";
import { NodeTypes } from "@vue/compiler-dom";

/**
 * Transforms component props to extract translation keys.
 * @param el - The ElementNode representing the component.
 * @param componentInitialIndex - The initial index of the component.
 * @param propKeyMap - A map of prop keys.
 * @param scriptVariableMap - A map of script variable references.
 * @param currentComponentName - The name of the current component.
 * @returns {PayloadEntry[]} representing the extracted translation keys from component props.
 */
export function transformComponentProps(
  el: WrappableElementNode,
  componentInitialIndex: ComponentInitialIndex,
  propKeyMap: PropKeyMap,
  scriptVariableMap: ScriptVariableMap,
  currentComponentName: string,
): PayloadEntry[] {
  const entries: PayloadEntry[] = [];

  // Phase 0: Native Element ID mapping
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
    }
  }

  // Phase 4: Component Usage Mapping
  const initialPropMap = componentInitialIndex.get(toPascalCase(el.tag));
  if (!initialPropMap) return entries;

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

    const expressionKeys = extractKeys(expression, scriptVariableMap);
    const keys = [...new Set(expressionKeys)];
    if (keys.length === 0) continue;

    for (const key of keys) {
      for (const lookupEntry of lookupEntries) {
        const propEntry = propKeyMap
          .get(lookupEntry.componentEnd)
          ?.get(propName);
        if (!propEntry) continue;

        const candidate = propEntry.candidates.find(
          (c) => c.id === lookupEntry.propId && c.key === key,
        );
        if (!candidate) continue;

        entries.push({
          type: KeyExtractionType.Traced,
          key: candidate.key,
          allCandidates: [candidate.key], // string[] not { key: string }[]
          id: `__TRACED__${propName}__${candidate.id}` as `__TRACED__${string}`,
          propId: candidate.id,
          element: lookupEntry.element,
          usageType: `prop:${propName}`,
        } as PayloadEntry & { propId: string; element: string });
      }
    }
  }

  return entries;
}
