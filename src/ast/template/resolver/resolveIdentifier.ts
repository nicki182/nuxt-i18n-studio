// resolveIdentifier.ts
import type { Identifier } from "estree";

import type { ExtractedKey, ScriptVariableMap } from "../../types";

import { KeyExtractionType } from "../../constants";
/**
 * Resolves an Identifier node by extracting keys based on the provided script variable map.
 * @param args An object containing the Identifier node, the raw source code, and a map of script variables.
 * @param args.node The Identifier node to resolve.
 * @param args.valueMap A map of script variables that can be used to resolve identifiers to their values.
 * @param args.rawSource The raw source code of the script, which may be used for context or fallback values.
 * @returns An array of extracted keys, where each key is an object containing the resolved value and associated metadata.
 */
export function resolveIdentifier(args: {
  node: Identifier;
  valueMap: ScriptVariableMap;
  rawSource: string;
}): ExtractedKey[] {
  const { node, valueMap, rawSource } = args;
  const name = node.name;
  const candidates = valueMap.get(name);

  if (!candidates) {
    return [
      {
        type: KeyExtractionType.Dynamic,
        expr: rawSource,
        candidates: [],
        id: `__EXPR__${rawSource}`,
      },
    ];
  }

  if (candidates[0] === "__PROP__") {
    return [
      { type: KeyExtractionType.Prop, propName: name, id: `__PROP__${name}` },
    ];
  }

  const results: ExtractedKey[] = [];

  results.push({
    type: KeyExtractionType.Traced,
    key: candidates[0] ?? "",
    allCandidates: [...candidates],
    id: `__TRACED__${candidates[0] ?? ""}` as `__TRACED__${string}`,
  });

  candidates.forEach((c) => {
    results.push({
      type: KeyExtractionType.Static,
      key: c,
      id: `__STATIC__${c}` as `__STATIC__${string}`,
    });
  });

  return results;
}
