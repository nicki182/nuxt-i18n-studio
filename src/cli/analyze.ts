#!/usr/bin/env node
import type { RawInputFile } from "@ast/types";

import { analyzeProject } from "@ast/analyzer";
import { collectEntryPoints, collectVueFiles } from "@ast/fs";
import { logger } from "@utils";
import fs from "node:fs";
import path from "node:path";

/**
 * Runs the analysis process for a Nuxt project, generating a prop map report.
 * @param options - The options for the analysis, including root directory and output path
 * @param options.root - The root directory of the Nuxt project
 * @param options.output - The output path for the generated prop map report
 */
export function runAnalyze(options: { root: string; output: string }): void {
  const { root, output } = options;

  logger.log("\n🔍 i18n-Studio: Analyzing component prop chains...\n");

  const allFilePaths = collectVueFiles(root);
  logger.log(`   Found ${allFilePaths.length} Vue files`);

  if (allFilePaths.length === 0) {
    logger.log("   No Vue files found. Nothing to analyze.\n");
    return;
  }

  const entryPoints = collectEntryPoints(root);
  logger.log(`   Entry points: ${entryPoints.length} page(s)/layout(s) found`);

  if (entryPoints.length === 0) {
    logger.log("   No pages or layouts found. Check --root points to the project root.\n");
    return;
  }

  // Purely map raw disk states to memory inputs for the analysis engine
  const rawInputFiles: RawInputFile[] = allFilePaths.reduce<RawInputFile[]>((acc, file) => {
    try {
      const source = fs.readFileSync(file, "utf-8");
      acc.push({
        relativePath: path.relative(root, file),
        source,
      });
    } catch {
      logger.warn(`   Failed to read file: ${file}. Skipping...`);
    }
    return acc;
  }, []);

  const entryFilePaths = entryPoints.map((f) => path.relative(root, f));

  const { jsonReport, metrics } = analyzeProject(rawInputFiles, entryFilePaths);

  logger.log(`   Mapped ${metrics.totalProps} propd(s) across ${metrics.componentCount} component(s)`);
  logger.log(`   Resolved ${metrics.totalCandidates} total candidate(s)`);

  const outputPath = path.resolve(root, output);
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(jsonReport, null, 2), "utf-8");

  logger.success(`Prop map written to: ${path.relative(root, outputPath)}`);
  logger.log(`   Tip: add .i18n-studio/ to your .gitignore\n`);
}
