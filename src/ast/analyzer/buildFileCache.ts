import type { ElementCacheEntry, ScriptVariableMap, TemplateVariableMap, RawInputFile } from "../types";

import { toPascalCase } from "../helper";
import { parseSfc } from "../parseSfc";
import { mapScriptState } from "../script/mapScriptState";
import { mapScriptTranslations } from "../script/mapScriptTranslations";

export function buildFileCache(rawFiles: RawInputFile[]): ElementCacheEntry[] {
  return rawFiles.map(({ relativePath, source }) => {
    const { scriptContent, templateContent } = parseSfc(source);
    const basename = relativePath.split("/").pop()?.replace(".vue", "") ?? "";
    const componentName = toPascalCase(basename);

    const scriptVariableMap: ScriptVariableMap = scriptContent
      ? mapScriptState(scriptContent)
      : new Map<string, string[]>();

    const templateVariableMap: TemplateVariableMap = scriptContent
      ? mapScriptTranslations(scriptContent)
      : new Map<string, never>();

    return {
      componentName,
      filePath: relativePath,
      scriptVariableMap,
      templateVariableMap,
      templateContent,
      scriptContent,
    };
  });
}
