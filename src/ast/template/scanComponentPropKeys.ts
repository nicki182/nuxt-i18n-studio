import type {
  AttributeNode,
  DirectiveNode,
  SimpleExpressionNode,
} from "@vue/compiler-dom";

import { NodeTypes, parse } from "@vue/compiler-dom";

import type { ScriptVariableMap, TemplateVariableMap, PropKeyMap } from "../types";

import { extractTemplateTranslations } from "./extractTemplateTranslations";

export function scanComponentPropKeys(
  templateContent: string,
  scriptVariableMap: ScriptVariableMap,
  templateVariableMap: TemplateVariableMap,
  propKeyMap: PropKeyMap,
): void {
  let ast;
  try {
    ast = parse(templateContent);
  } catch {
    return;
  }

  // Walk manually — no traverseNode needed, avoids context.helper issues
  walkNode(ast, scriptVariableMap, templateVariableMap, propKeyMap);
}

function walkNode(
  node: unknown,
  scriptVariableMap: ScriptVariableMap,
  templateVariableMap: TemplateVariableMap,
  propKeyMap: PropKeyMap,
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

      // Case 1: :header="$t('some.key')" — direct t() call
      for (const entry of extractTemplateTranslations(expression, scriptVariableMap)) {
        if ("key" in entry && entry.key) keys.add(entry.key);
        if ("allCandidates" in entry)
          (entry.allCandidates as string[]).forEach((k) => keys.add(k));
      }

      // Case 2: :header="header" — prop passthrough
      // Forward keys already stored for this prop name from a grandparent
      if (scriptVariableMap.get(expression)?.includes("__PROP__")) {
        for (const [, propMap] of propKeyMap) {
          const forwarded = propMap.get(expression);
          if (forwarded) forwarded.forEach((k) => keys.add(k));
        }
      }

      if (keys.size === 0) continue;

      if (!propKeyMap.has(componentName)) propKeyMap.set(componentName, new Map());
      const existing = propKeyMap.get(componentName)!.get(propName) ?? [];
      propKeyMap.get(componentName)!.set(propName, [
        ...new Set([...existing, ...keys]),
      ]);
    }
  }

  // Recurse into children
  if (Array.isArray(n.children)) {
    for (const child of n.children) {
      walkNode(child, scriptVariableMap, templateVariableMap, propKeyMap);
    }
  }
}
