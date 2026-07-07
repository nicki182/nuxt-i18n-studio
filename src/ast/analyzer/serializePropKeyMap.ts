import type { PropKeyMap, PropMapJson } from "@ast/types";

/**
 * Serializes a PropKeyMap into a PropMapJson structure.
 * @param propKeyMap - The PropKeyMap to serialize.
 * @returns A PropMapJson representation of the PropKeyMap.
 */
export function serializePropKeyMap(propKeyMap: PropKeyMap): PropMapJson {
  const byComponentEnd: PropMapJson["byComponentEnd"] = {};
  const byComponentInitial: PropMapJson["byComponentInitial"] = {};

  for (const [componentEnd, propMap] of propKeyMap) {
    for (const [propName, entry] of propMap) {
      if (entry.candidates.length === 0) continue;

      if (!byComponentEnd[componentEnd]) {
        byComponentEnd[componentEnd] = {};
      }

      byComponentEnd[componentEnd][propName] = {
        element: entry.element,
        candidates: entry.candidates,
      };

      for (const candidate of entry.candidates) {
        const { componentInitial, id, element } = candidate;

        if (!byComponentInitial[componentInitial]) {
          byComponentInitial[componentInitial] = {};
        }
        if (!byComponentInitial[componentInitial][propName]) {
          byComponentInitial[componentInitial][propName] = [];
        }

        byComponentInitial[componentInitial][propName].push({
          propId: id,
          element,
          componentEnd,
        });
      }
    }
  }

  return { byComponentEnd, byComponentInitial };
}
