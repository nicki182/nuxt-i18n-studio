import type {
  ASTPlugin,
  ScriptVariableMap,
  TemplateVariableMap,
  PropKeyMap,
} from "./types";

import { parseSfc } from "./parseSfc";
import { mapScriptState } from "./script/mapScriptState";
import { mapScriptTranslations } from "./script/mapScriptTranslations";
// import { scanComponentPropKeys } from "./template";

export function ASTPlugin(): ASTPlugin {
  const valueMapCache = new Map<string, ScriptVariableMap>();
  const templateMapCache = new Map<string, TemplateVariableMap>();

  // componentName → propName → keys[]
  // e.g. "HeaderAppPageEvent" → "header" → ["i18n._global.faq"]
  // Populated as each file is transformed, persists across HMR
  const propKeyMap: PropKeyMap = new Map();

  return {
    name: "vite-plugin-ast-i18n-studio",
    enforce: "pre",

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

      // Scan this file's template for component usages that pass $t() keys
      // or prop passthroughs as props — populate propKeyMap for child components
      // if (templateContent) {
      //   scanComponentPropKeys(
      //     templateContent,
      //     scriptVariableMap,
      //     templateVariableMap,
      //     propKeyMap,
      //   );
      // }

      return null;
    },

    handleHotUpdate({ file }) {
      if (file.endsWith(".vue")) {
        valueMapCache.delete(file);
        templateMapCache.delete(file);
        // Don't clear propKeyMap — it gets overwritten on re-transform
      }
    },

    get _valueMapCache() { return valueMapCache; },
    get _templateMapCache() { return templateMapCache; },
    get _propKeyMap() { return propKeyMap; },
  };
}
