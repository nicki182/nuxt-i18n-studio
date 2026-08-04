import type { ElementCacheEntry, PropKeyMap, ScanContext } from "@ast/types";

import { parse } from "@vue/compiler-dom";

import { applyCandidate } from "./helper";
import { scanTemplateForInitialKeys } from "./scanTemplateForInitialKeys";

/**
 * Builds a property key map by scanning the provided file cache and entry file paths.
 * This is the only function that writes to propKeyMap — all inner functions return data.
 * @param fileCache - An array of ElementCacheEntry objects representing the cached files.
 * @param entryFilePaths - An array of file paths to initiate the scanning process.
 * @returns {PropKeyMap} - A map containing component names, their associated props, and candidates.
 */
export function buildPropKeyMap(
  fileCache: ElementCacheEntry[],
  entryFilePaths: string[],
): PropKeyMap {
  const propKeyMap: PropKeyMap = new Map();
  const ctx: ScanContext = {
    propKeyMap,
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

  // 2. Walk entry files, collect candidates, and apply them — single write site
  for (const filePath of entryFilePaths) {
    const entry = ctx.byFilePath.get(filePath);
    if (!entry?.templateContent) continue;

    try {
      const candidates = scanTemplateForInitialKeys(
        parse(entry.templateContent),
        entry,
        ctx,
      );

      for (const candidate of candidates) {
        applyCandidate(
          propKeyMap,
          candidate.componentEnd,
          candidate.propName,
          candidate,
        );
      }
    } catch {
      continue; // Graceful parse bypass
    }
  }

  return propKeyMap;
}
