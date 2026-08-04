import type { ElementCacheEntry, PropCandidate, ScanContext } from "@ast/types";

import { extractKeys } from "@ast/helper";
import { logger, toPascalCase } from "@utils";
import { parse } from "@vue/compiler-dom";

import { isElementNode, isDirectiveNode, hasChildren } from "./helper";
import { visitPropChain } from "./visitPropChains";

/**
 * Recursively scans a Vue template AST node for initial translation keys.
 * Returns all matched candidates without writing to any map.
 * @param node - The current AST node to scan.
 * @param fileEntry - The cache entry for the current file being scanned.
 * @param ctx - The scanning context (used for lookups and visited tracking only).
 * @returns {PropCandidate[]} - All candidates found in this subtree.
 */
export function scanTemplateForInitialKeys(
  node: unknown,
  fileEntry: ElementCacheEntry,
  ctx: ScanContext,
): PropCandidate[] {
  const results: PropCandidate[] = [];

  if (isElementNode(node) && node.tagType === 1 && node.tag) {
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
        results.push(
          ...visitPropChain(ctx, {
            key,
            sourcePath: fileEntry.filePath,
            componentInitial: componentName,
            componentName,
            propName,
          }),
        );
      }
    }

    // 2. Recurse into the child component's template
    const childEntry = ctx.byComponentName.get(componentName);
    if (childEntry?.templateContent) {
      const visitedCompHash = `__comp__${componentName}`;
      if (!ctx.visited.has(visitedCompHash)) {
        ctx.visited.add(visitedCompHash);
        try {
          results.push(
            ...scanTemplateForInitialKeys(
              parse(childEntry.templateContent),
              childEntry,
              ctx,
            ),
          );
        } catch {
          logger.warn(
            `Failed to parse template for component ${componentName} in file ${childEntry.filePath}. Skipping.`,
          );
        }
      }
    }
  }

  if (hasChildren(node)) {
    for (const child of node.children) {
      results.push(...scanTemplateForInitialKeys(child, fileEntry, ctx));
    }
  }

  return results;
}
