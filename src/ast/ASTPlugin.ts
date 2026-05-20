import type {
  ASTPlugin,
  ScriptVariableMap,
  TemplateVariableMap,
} from "./types";

import { parseSfc } from "./parseSfc";
import { mapScriptState } from "./script/mapScriptState";
import { mapScriptTranslations } from "./script/mapScriptTranslations";

/**
 * Vite Plugin:
 * Vite's transform() hook receives the full raw .vue source before any
 * compilation — so we can parse the script block, build the valueMap, and
 * cache it keyed by file ID for the nodeTransform to read.
 * @returns An object conforming to the ASTPlugin interface that can be used as a Vite plugin.
 */
export function ASTPlugin(): ASTPlugin {
  // Per-file cache: absolute path → valueMap
  // Invalidated on HMR so edits to script variables are picked up immediately
  const valueMapCache = new Map<string, ScriptVariableMap>();
  const templateMapCache = new Map<string, TemplateVariableMap>();

  return {
    name: "vite-plugin-ast-i18n-studio",
    // Run before @vitejs/plugin-vue so the valueMap is ready when the
    // template compiler fires the nodeTransform
    enforce: "pre",

    transform(source, id) {
      if (!id.endsWith(".vue")) return null;

      const { scriptContent } = parseSfc(source);

      valueMapCache.set(
        id,
        scriptContent
          ? mapScriptState(scriptContent)
          : new Map<string, string[]>(),
      );
      templateMapCache.set(
        id,
        scriptContent ? mapScriptTranslations(scriptContent) : new Map(),
      );

      // Don't transform source — just populate the cache.
      // The nodeTransform registered in setup() does the actual injection.
      return null;
    },

    handleHotUpdate({ file }) {
      if (file.endsWith(".vue")) {
        valueMapCache.delete(file);
        templateMapCache.delete(file);
      }
    },

    get _valueMapCache() {
      return valueMapCache;
    },
    get _templateMapCache() {
      return templateMapCache;
    },
  };
}
