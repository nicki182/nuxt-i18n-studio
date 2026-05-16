// resolveIdentifier.ts
import type { Identifier } from "estree";

import {
  KeyExtractionType,
  type ExtractedKey,
  type ScriptVariableMap,
} from "../../types";

/**
 *
 * @param args
 * @param args.node
 * @param args.valueMap
 * @param args.rawSource
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
