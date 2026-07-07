import type { RawInputFile, AnalyzeResult } from "@ast/types";

import { buildPropKeyMap } from "@ast/transformer";

import { assignCandidateIds } from "./assignCandidateIds";
import { buildFileCache } from "./buildFileCache";
import { serializePropKeyMap } from "./serializePropKeyMap";

/**
 * Analyzes a project by processing raw input files and generating a report.
 * @param rawFiles - The raw input files to analyze.
 * @param entryFilePaths - The entry file paths for the analysis.
 * @returns An object containing the JSON report and metrics.
 */
export function analyzeProject(
  rawFiles: RawInputFile[],
  entryFilePaths: string[],
): AnalyzeResult {
  const fileCache = buildFileCache(rawFiles);
  const propKeyMap = buildPropKeyMap(fileCache, entryFilePaths);

  assignCandidateIds(propKeyMap);

  const totalProps = [...propKeyMap.values()].reduce(
    (sum, m) => sum + m.size,
    0,
  );
  const totalCandidates = [...propKeyMap.values()].reduce(
    (sum, m) => [...m.values()].reduce((s, e) => s + e.candidates.length, sum),
    0,
  );

  return {
    jsonReport: serializePropKeyMap(propKeyMap),
    metrics: {
      componentCount: propKeyMap.size,
      totalProps,
      totalCandidates,
    },
  };
}
