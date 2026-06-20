import { parse } from "@vue/compiler-dom";

import type { ElementCacheEntry, ScanContext } from "../../types";

import {
  isElementNode,
  isDirectiveNode,
  hasChildren,
  toPascalCase,
  extractKeys,
} from "../../helper";
import { visitPropChain } from "./visitPropChains";

export function scanTemplateForInitialKeys(
  node: unknown,
  fileEntry: ElementCacheEntry,
  ctx: ScanContext,
): void {
  if (isElementNode(node) && node.tagType === 1 && node.tag) {
    // Convert the template tag to PascalCase to match our registry
    const componentName = toPascalCase(node.tag);

    // 1. Check bound component props for $t() usage
    for (const prop of node.props) {
      if (
        !isDirectiveNode(prop) ||
        prop.name !== "bind" ||
        !prop.arg ||
        !prop.exp
      )
        continue;

      const propName = prop.arg.content;
      const expression = prop.exp.loc?.source?.trim();
      if (!propName || !expression) continue;

      const keys = extractKeys(expression, fileEntry.scriptVariableMap);
      for (const key of keys) {
        visitPropChain(ctx, {
          key,
          sourcePath: fileEntry.filePath,
          componentInitial: componentName, // <-- Use normalized name
          componentName: componentName, // <-- Use normalized name
          propName,
        });
      }
    }

    // 2. Recurse into the child component's template using the normalized name
    const childEntry = ctx.byComponentName.get(componentName);
    if (childEntry?.templateContent) {
      const visitedCompHash = `__comp__${componentName}`;
      if (!ctx.visited.has(visitedCompHash)) {
        ctx.visited.add(visitedCompHash);
        try {
          scanTemplateForInitialKeys(
            parse(childEntry.templateContent),
            childEntry,
            ctx,
          );
        } catch {}
      }
    }
  }

  if (hasChildren(node)) {
    node.children.forEach((child) =>
      scanTemplateForInitialKeys(child, fileEntry, ctx),
    );
  }
}
