import type {
  SimpleExpressionNode,
} from "@vue/compiler-dom";

import { NodeTypes, parse } from "@vue/compiler-dom";

import type { ScriptVariableMap, TemplateVariableMap, PropKeyMap } from "../types";

import { extractTemplateTranslations } from "./extractTemplateTranslations";

/**
 * Scans a component's template for child component usages that pass props
 * which resolve to i18n keys. Populates propKeyMap with those mappings.
 *
 * @param templateContent  The raw template string of the component being scanned
 * @param scriptVariableMap  The script variable map for this component
 * @param templateVariableMap  The template variable map for this component
 * @param propKeyMap  The shared map being built across all components
 * @param selfComponentName  The PascalCase name of the component being scanned.
 *                           Used to resolve prop passthroughs — when this component
 *                           passes one of its own props down to a child.
 * @returns true if any new entries were added to propKeyMap (used by stabilisation loop)
 */
export function scanComponentPropKeys(
  templateContent: string,
  scriptVariableMap: ScriptVariableMap,
  templateVariableMap: TemplateVariableMap,
  propKeyMap: PropKeyMap,
  selfComponentName: string,
): boolean {
  let ast;
  try {
    ast = parse(templateContent);
  } catch {
    return false;
  }

  let changed = false;

  walkNode(ast, scriptVariableMap, templateVariableMap, propKeyMap, selfComponentName, () => {
    changed = true;
  });

  return changed;
}

function walkNode(
  node: unknown,
  scriptVariableMap: ScriptVariableMap,
  templateVariableMap: TemplateVariableMap,
  propKeyMap: PropKeyMap,
  selfComponentName: string,
  markChanged: () => void,
): void {
  if (!node || typeof node !== "object") return;
  const n = node as {
    type?: number;
    tag?: string;
    tagType?: number;
    props?: unknown[];
    children?: unknown[];
  };

  if (
    n.type === NodeTypes.ELEMENT &&
    n.tagType === 1 && // Component only
    n.tag &&
    Array.isArray(n.props)
  ) {
    const componentName = n.tag;

    for (const prop of n.props) {
      const p = prop as {
        type?: number;
        name?: string;
        arg?: unknown;
        exp?: unknown;
      };
      if (p.type !== NodeTypes.DIRECTIVE || p.name !== "bind") continue;

      const arg = p.arg as SimpleExpressionNode | undefined;
      const exp = p.exp as SimpleExpressionNode | undefined;
      if (!arg || !exp) continue;

      const propName = arg.content;
      const expression = exp.loc?.source?.trim();
      if (!propName || !expression) continue;

      const keys = new Set<string>();

      // Case 1: :header="$t('some.key')" — direct t() call in template
      for (const entry of extractTemplateTranslations(expression, scriptVariableMap)) {
        if ("key" in entry && entry.key) keys.add(entry.key);
        if ("allCandidates" in entry)
          (entry.allCandidates as string[]).forEach((k) => keys.add(k));
      }

      // Case 2: :header="someVar" where someVar resolves to keys via templateVariableMap
      for (const resolver of templateVariableMap.get(expression) ?? []) {
        if ("key" in resolver && resolver.key) keys.add(resolver.key);
        if ("allCandidates" in resolver)
          (resolver.allCandidates as string[]).forEach((k) => keys.add(k));
      }

      // Case 3: :header="title" where title is a prop of selfComponentName
      // i.e. this component is passing one of its own received props down to a child.
      // Look up what keys selfComponentName's "title" prop carries.
      if (scriptVariableMap.get(expression)?.includes("__PROP__")) {
        const selfPropKeys = propKeyMap.get(selfComponentName)?.get(expression);
        if (selfPropKeys) {
          selfPropKeys.forEach((k) => keys.add(k));
        }
      }

      if (keys.size === 0) continue;

      if (!propKeyMap.has(componentName)) propKeyMap.set(componentName, new Map());
      const existing = propKeyMap.get(componentName)!.get(propName) ?? [];
      const merged = [...new Set([...existing, ...keys])];

      // Only mark changed if we're actually adding new keys
      if (merged.length > existing.length) {
        propKeyMap.get(componentName)!.set(propName, merged);
        markChanged();
      }
    }
  }

  // Recurse into children
  if (Array.isArray(n.children)) {
    for (const child of n.children) {
      walkNode(child, scriptVariableMap, templateVariableMap, propKeyMap, selfComponentName, markChanged);
    }
  }
}
