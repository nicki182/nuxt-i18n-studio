import type { PropKeyMap } from "../types";

import { generateCandidateId } from "../helper";

export function assignCandidateIds(propKeyMap: PropKeyMap): void {
  for (const [componentName, propMap] of propKeyMap) {
    for (const [propName, entry] of propMap) {
      entry.candidates = entry.candidates.map((candidate, index) => ({
        ...candidate,
        id: generateCandidateId(componentName, propName, index),
      }));
    }
  }
}
