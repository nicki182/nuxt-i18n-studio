import { parseSfc } from "@ast/parseSfc";
import { mapScriptState,mapScriptTranslations } from "@ast/script";
import { toPascalCase } from "@utils";

import type {
  ElementCacheEntry,
  ScriptVariableMap,
  TemplateVariableMap,
  RawInputFile,
} from "../types";


/**
 * Builds a cache of element entries from raw input files.
 * @param rawFiles - The raw input files to process.
 * @returns An array of element cache entries.
 */
export function buildFileCache(rawFiles: RawInputFile[]): ElementCacheEntry[] {
  return rawFiles.map(({ relativePath, source }) => {
    const { scriptContent, templateContent } = parseSfc(source);
    const basename = relativePath.split("/").pop()?.replace(".vue", "") ?? "";
    const componentName = toPascalCase(basename);

    const scriptVariableMap: ScriptVariableMap = scriptContent
      ? mapScriptState(scriptContent)
      : new Map<string, string[]>()

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
