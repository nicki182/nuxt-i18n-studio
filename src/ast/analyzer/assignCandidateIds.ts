import type { PropKeyMap } from "../types";

import { generateCandidateId } from "../helper";

/**
 * Assigns unique IDs to each candidate in the PropKeyMap.
 * @param propKeyMap - The PropKeyMap containing components and their properties.
 */
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
