import type { ExtractedKey, TemplateVariableMap } from "../types";

import { KeyExtractionType } from "../constants";

// ── extractVariableTranslations ───────────────────────────────────────────────
// Resolves plain identifier references in the template (e.g. {{ title }})
// that are NOT wrapped in $t() but whose underlying script variable
// calls t() internally.
//
// Only resolves identifiers that are explicitly in the ScriptTCallMap —
// no guessing, no broad inference.
//
// Examples:
//   const title = computed(() => t('home.title'))
//   → {{ title }} resolves to [{ type: "static", key: "home.title" }]
//
//   const getLabel = (type) => t(`home.${type}`)
//   → {{ getLabel }} resolves to [{ type: "prefix", prefix: "home." }]
/**
 *
 * @param identifierName
 * @param templateVariableMap
 */
export function extractScriptTranslations(
  identifierName: string,
  templateVariableMap: TemplateVariableMap,
): ExtractedKey[] {
  const calls = templateVariableMap.get(identifierName);
  if (!calls?.length) return [];

  const results: ExtractedKey[] = [];
  const seen = new Set<string>();

  for (const call of calls) {
    if (seen.has(call.id)) continue;
    seen.add(call.id);

    switch (call.type) {
      case "direct":
        results.push({
          type: KeyExtractionType.Static,
          key: call.key,
          id: `__STATIC__${call.key}`,
        });
        break;

      case "prefix":
        results.push({
          type: KeyExtractionType.Prefix,
          prefix: call.prefix,
          id: `__PREFIX__${call.prefix}`,
        });
        break;

      case "dynamic":
        results.push({
          type: KeyExtractionType.Dynamic,
          expr: call.expr,
          candidates: [],
          id: `__EXPR__${call.expr}`,
        });
        break;
    }
  }

  return results;
}
