import type { RawInputFile, AnalyzeResult } from "../types";

import { buildPropKeyMap } from "../template/scanComponentPropKeys";
import { assignCandidateIds } from "./assignCandidateIds";
import { buildFileCache } from "./buildFileCache";
import { serialisePropKeyMap } from "./serializePropKeyMap";



export function analyzeProject(
  rawFiles: RawInputFile[],
  entryFilePaths: string[]
): AnalyzeResult {
  const fileCache = buildFileCache(rawFiles);
  const propKeyMap = buildPropKeyMap(fileCache, entryFilePaths);

  assignCandidateIds(propKeyMap);

  const totalProps = [...propKeyMap.values()].reduce((sum, m) => sum + m.size, 0);
  const totalCandidates = [...propKeyMap.values()].reduce(
    (sum, m) => [...m.values()].reduce((s, e) => s + e.candidates.length, sum),
    0
  );

  return {
    jsonReport: serialisePropKeyMap(propKeyMap),
    metrics: {
      componentCount: propKeyMap.size,
      totalProps,
      totalCandidates,
    }
  };
}
