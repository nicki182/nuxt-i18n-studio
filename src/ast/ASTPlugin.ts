
import fs from "node:fs";
import path from "node:path";

import type {
  ASTPlugin,
  ScriptVariableMap,
  TemplateVariableMap,
  PropKeyMap,
  ComponentInitialIndex,
} from "./types";

import { PROP_MAP_FILE, PROP_MAP_ROUTE } from "./constants";
import { loadPropMap, buildFlatIndex } from "./helper";
import { parseSfc } from "./parseSfc";
import { mapScriptState } from "./script/mapScriptState";
import { mapScriptTranslations } from "./script/mapScriptTranslations";

// ── State ─────────────────────────────────────────────────────────────────────

const valueMapCache = new Map<string, ScriptVariableMap>();
const templateMapCache = new Map<string, TemplateVariableMap>();
const propKeyMap: PropKeyMap = new Map();
const componentInitialIndex: ComponentInitialIndex = new Map();
const propIdIndex = new Map<string, Record<string, unknown>>();

// ── Plugin ────────────────────────────────────────────────────────────────────
/**
 *  Creates a Vite plugin that processes Vue files for i18n translation keys.
 * @returns {ASTPlugin} - A Vite plugin object with hooks for build start, server configuration, bundle writing, and file transformation.
 */
export function ASTPlugin(): ASTPlugin {
  return {
    name: "vite-plugin-ast-i18n-studio",
    enforce: "pre",

    buildStart() {
      loadPropMap(path.resolve(process.cwd(), PROP_MAP_FILE),{
        propKeyMap,
        componentInitialIndex,
        propIdIndex,
      });
    },

    configureServer(server) {
      server.middlewares.use(PROP_MAP_ROUTE, (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(buildFlatIndex(propIdIndex));
      });
    },

    writeBundle() {
      const outDir = path.resolve(process.cwd(), "public/__i18n_studio");
      try {
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }
        fs.writeFileSync(
          path.join(outDir, "prop-map.json"),
          buildFlatIndex(propIdIndex),
          "utf-8",
        );
      } catch {
        // Skip if public/ not writable
      }
    },

    transform(source, id) {
      if (!id.endsWith(".vue")) return null;
      const { scriptContent } = parseSfc(source);

      valueMapCache.set(
        id,
        scriptContent ? mapScriptState(scriptContent) : new Map<string, string[]>(),
      );
      templateMapCache.set(
        id,
        scriptContent ? mapScriptTranslations(scriptContent) : new Map<string, never>(),
      );

      return null;
    },

    handleHotUpdate({ file }) {
      if (file.endsWith(".vue")) {
        valueMapCache.delete(file);
        templateMapCache.delete(file);
      }
      if (file.endsWith("prop-map.json")) {
        loadPropMap(file,{
          propKeyMap,
          componentInitialIndex,
          propIdIndex,
        });
      }
    },

    get _valueMapCache() { return valueMapCache; },
    get _templateMapCache() { return templateMapCache; },
    get _propKeyMap() { return propKeyMap; },
    get _componentInitialIndex() { return componentInitialIndex; },
  };
}
