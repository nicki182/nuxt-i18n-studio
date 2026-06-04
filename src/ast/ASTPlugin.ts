import fs from "node:fs";
import path from "node:path";

import type {
  ASTPlugin,
  ScriptVariableMap,
  TemplateVariableMap,
  PropKeyMap,
} from "./types";

import { parseSfc } from "./parseSfc";
import { mapScriptState } from "./script/mapScriptState";
import { mapScriptTranslations } from "./script/mapScriptTranslations";

export function ASTPlugin(): ASTPlugin {
  const valueMapCache = new Map<string, ScriptVariableMap>();
  const templateMapCache = new Map<string, TemplateVariableMap>();

  // componentName → propName → keys[]
  // Pre-populated from .i18n-studio/prop-map.json in buildStart,
  // then kept alive across HMR for incremental updates.
  const propKeyMap: PropKeyMap = new Map();

  return {
    name: "vite-plugin-ast-i18n-studio",
    enforce: "pre",

    buildStart() {
      // Load the pre-analysed prop map if it exists.
      // Written by `i18n-studio analyze` — a single JSON read, near-zero cost.
      const mapPath = path.resolve(process.cwd(), ".i18n-studio/prop-map.json");
      try {
        const raw = fs.readFileSync(mapPath, "utf-8");
        const json = JSON.parse(raw) as Record<string, Record<string, string[]>>;

        for (const [component, props] of Object.entries(json)) {
          const propMapEntry = new Map<string, string[]>();
          for (const [propName, keys] of Object.entries(props)) {
            propMapEntry.set(propName, keys);
          }
          propKeyMap.set(component, propMapEntry);
        }

        const totalProps = [...propKeyMap.values()].reduce((s, m) => s + m.size, 0);
        console.log(
          `[i18n-Studio] Loaded prop map: ${propKeyMap.size} components, ${totalProps} props resolved`,
        );
      } catch {
        // No prop-map.json yet — silent fallback.
        // Run `i18n-studio analyze` to enable deep prop-chain resolution.
      }
    },

    transform(source, id) {
      if (!id.endsWith(".vue")) return null;

      const { scriptContent } = parseSfc(source);

      const scriptVariableMap = scriptContent
        ? mapScriptState(scriptContent)
        : new Map<string, string[]>();

      const templateVariableMap = scriptContent
        ? mapScriptTranslations(scriptContent)
        : new Map<string, never>();

      valueMapCache.set(id, scriptVariableMap);
      templateMapCache.set(id, templateVariableMap);

      return null;
    },

    handleHotUpdate({ file }) {
      if (file.endsWith(".vue")) {
        valueMapCache.delete(file);
        templateMapCache.delete(file);
      }
    },

    get _valueMapCache() { return valueMapCache; },
    get _templateMapCache() { return templateMapCache; },
    get _propKeyMap() { return propKeyMap; },
  };
}
