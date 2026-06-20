import { parse } from "@vue/compiler-dom";

import type { ElementCacheEntry, PropKeyMap, ScanContext } from "../../types";

import { scanTemplateForInitialKeys } from "./scanTemplateForInitialKeys";

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
