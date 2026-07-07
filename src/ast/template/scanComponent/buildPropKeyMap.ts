import type { ElementCacheEntry, PropKeyMap, ScanContext } from "@ast/types";

import { parse } from "@vue/compiler-dom";

import { scanTemplateForInitialKeys } from "./scanTemplateForInitialKeys";

/**
 * Builds a property key map by scanning the provided file cache and entry file paths.
 * @param fileCache - An array of ElementCacheEntry objects representing the cached files.
 * @param entryFilePaths - An array of file paths to initiate the scanning process.
 * @returns {PropKeyMap} - A map containing component names, their associated props, and candidates.
 */
export function buildPropKeyMap(
  fileCache: ElementCacheEntry[],
  entryFilePaths: string[],
): PropKeyMap {
  const ctx: ScanContext = {
    propKeyMap: new Map(),
    byFilePath: new Map(),
    byComponentName: new Map(),
    visited: new Set(),
  };

  // 1. Build fast lookup maps
  for (const entry of fileCache) {
    ctx.byFilePath.set(entry.filePath, entry);
    if (!ctx.byComponentName.has(entry.componentName)) {
      ctx.byComponentName.set(entry.componentName, entry);
    }
  }

  // 2. Initiate the walk on entry files
  for (const filePath of entryFilePaths) {
    const entry = ctx.byFilePath.get(filePath);
    if (!entry?.templateContent) continue;

    try {
      scanTemplateForInitialKeys(parse(entry.templateContent), entry, ctx);
    } catch {
      continue; // Graceful parse bypass
    }
  }

  return ctx.propKeyMap;
}
