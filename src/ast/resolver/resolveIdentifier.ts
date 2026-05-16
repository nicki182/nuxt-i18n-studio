import type { ExtractedKey, ValueMap } from "../types";

export function resolveIdentifier(args: {
  node: any;
  valueMap: ValueMap;
  rawSource: string;
}): ExtractedKey[] {
  const { node, valueMap, rawSource } = args;
  const name = node.name;
  const candidates = valueMap.get(name);

  if (!candidates) {
    return [{ type: "dynamic", expr: rawSource, candidates: [], id: `__EXPR__${rawSource}` }];
  }

  if (candidates[0] === "__PROP__") {
    return [{ type: "prop", propName: name, id: `__PROP__${name}` }];
  }
  const results = [];
  results.push({
    type: "traced",
    key: candidates[0],
    allCandidates: [...candidates],
    id: `__TRACED__${candidates[0]}`
  });
  candidates.forEach((c) => {
    results.push({ type: "static", key: c, id: `__STATIC__${c}` });
  });
  return results;
}
