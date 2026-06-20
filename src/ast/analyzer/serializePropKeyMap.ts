import type { PropKeyMap, PropMapJson } from "../types";

export function serialisePropKeyMap(propKeyMap: PropKeyMap): PropMapJson {
  const byComponentEnd: PropMapJson["byComponentEnd"] = {};
  const byComponentInitial: PropMapJson["byComponentInitial"] = {};

  for (const [componentEnd, propMap] of propKeyMap) {
    byComponentEnd[componentEnd] = {};

    for (const [propName, entry] of propMap) {
      if (entry.candidates.length === 0) continue;

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

    if (Object.keys(byComponentEnd[componentEnd]).length === 0) {
      delete byComponentEnd[componentEnd];
    }
  }

  return { byComponentEnd, byComponentInitial };
}
