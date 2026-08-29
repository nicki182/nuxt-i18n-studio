import type { ElementCacheEntry, PropKeyMap, ScanContext } from "@ast/types";

import { buildComponentTree } from "./buildComponentTree";
import { applyCandidate } from "./helper";
import { verifyComponentTree } from "./verifyComponentTree";

/**
 * Builds a property key map by scanning the provided file cache and entry file paths.
 * This is the only function that writes to propKeyMap — all inner functions return data.
 *
 * Pipeline per entry file:
 * 1. buildComponentTree — materialize the component tree, one layer per nested component.
 * 2. verifyComponentTree — verify each layer for key-carrying props; the existing
 *    chain analysis (visitPropChain) runs only at layers where a prop is sent.
 * 3. applyCandidate — single write site into the map.
 *
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

  // 2. Walk entry files: build each tree, verify layer by layer, apply candidates
  for (const filePath of entryFilePaths) {
    const entry = ctx.byFilePath.get(filePath);
    if (!entry?.templateContent) continue;

    try {
      const tree = buildComponentTree(entry, ctx);
      const candidates = verifyComponentTree(tree, ctx);

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
