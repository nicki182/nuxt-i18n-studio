#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import type { PropKeyMap, ScriptVariableMap, TemplateVariableMap } from "../ast/types";

import { parseSfc } from "../ast/parseSfc";
import { mapScriptState } from "../ast/script/mapScriptState";
import { mapScriptTranslations } from "../ast/script/mapScriptTranslations";
import { buildPropKeyMap } from "../ast/template/scanComponentPropKeys";
import type { ElementCacheEntry } from "../ast/template/scanComponentPropKeys";

// ── Helpers ───────────────────────────────────────────────────────────────────

function toPascalCase(filename: string): string {
  return filename
    .replace(/[-_](.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (_, c: string) => c.toUpperCase());
}

function collectVueFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === ".nuxt" ||
      entry.name === ".output" ||
      entry.name.startsWith(".")
    )
      continue;

    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectVueFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".vue")) {
      results.push(full);
    }
  }

  return results;
}

function collectEntryPoints(root: string): string[] {
  const entryDirs = [
    path.join(root, "pages"),
    path.join(root, "layouts"),
    path.join(root, "app", "pages"),
    path.join(root, "app", "layouts"),
  ];

  const results: string[] = [];
  for (const dir of entryDirs) {
    if (fs.existsSync(dir)) {
      results.push(...collectVueFiles(dir));
    }
  }

  return results;
}

// ── Id generation ─────────────────────────────────────────────────────────────

function toSlug(componentName: string): string {
  const initials = componentName.match(/[A-Z]/g)?.join("").toLowerCase();
  return initials ?? componentName.toLowerCase().slice(0, 4);
}

function generateCandidateId(
  componentName: string,
  propName: string,
  index: number,
): string {
  const slug = toSlug(componentName);
  const safeProp = propName.replace(/[^a-zA-Z0-9]/g, "_");
  return `${slug}__${safeProp}__${index}`;
}

function assignCandidateIds(propKeyMap: PropKeyMap): void {
  for (const [componentName, propMap] of propKeyMap) {
    for (const [propName, entry] of propMap) {
      entry.candidates = entry.candidates.map((candidate, index) => ({
        ...candidate,
        id: generateCandidateId(componentName, propName, index),
      }));
    }
  }
}

// ── Per-file cache ────────────────────────────────────────────────────────────

function buildFileCache(files: string[], root: string): ElementCacheEntry[] {
  const cache: ElementCacheEntry[] = [];

  for (const file of files) {
    let source: string;
    try {
      source = fs.readFileSync(file, "utf-8");
    } catch {
      continue;
    }

    const { scriptContent, templateContent } = parseSfc(source);
    const basename = path.basename(file, ".vue");
    const componentName = toPascalCase(basename);
    const filePath = path.relative(root, file);

    const scriptVariableMap: ScriptVariableMap = scriptContent
      ? mapScriptState(scriptContent)
      : new Map<string, string[]>();

    const templateVariableMap: TemplateVariableMap = scriptContent
      ? mapScriptTranslations(scriptContent)
      : new Map<string, never>();

    cache.push({
      componentName,
      filePath,
      scriptVariableMap,
      templateVariableMap,
      templateContent,
      scriptContent,
    });
  }

  return cache;
}

// ── Serialise ─────────────────────────────────────────────────────────────────

function serialisePropKeyMap(propKeyMap: PropKeyMap): Record<
  string,
  Record<
    string,
    {
      element: string;
      candidates: {
        id: string;
        key: string;
        path: string;
        componentInitial: string;
        componentEnd: string;
        propName: string;
        element: string;
      }[];
    }
  >
> {
  const out: Record<string, Record<string, unknown>> = {};

  for (const [component, propMap] of propKeyMap) {
    out[component] = {};
    for (const [propName, entry] of propMap) {
      if (entry.candidates.length === 0) continue;
      out[component][propName] = {
        element: entry.element,
        candidates: entry.candidates,
      };
    }
    if (Object.keys(out[component]).length === 0) {
      delete out[component];
    }
  }

  return out as ReturnType<typeof serialisePropKeyMap>;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function runAnalyze(options: { root: string; output: string }): void {
  const { root, output } = options;

  console.log("\n🔍 i18n-Studio: Analyzing component prop chains...\n");

  const allFiles = collectVueFiles(root);
  console.log(`   Found ${allFiles.length} Vue files`);

  if (allFiles.length === 0) {
    console.log("   No Vue files found. Nothing to analyze.\n");
    return;
  }

  const entryPoints = collectEntryPoints(root);
  console.log(`   Entry points: ${entryPoints.length} page(s)/layout(s) found`);

  if (entryPoints.length === 0) {
    console.log(
      "   No pages or layouts found. Check --root points to the project root.\n",
    );
    return;
  }

  const fileCache = buildFileCache(allFiles, root);
  const entryFilePaths = entryPoints.map((f) => path.relative(root, f));

  const propKeyMap = buildPropKeyMap(fileCache, entryFilePaths);

  assignCandidateIds(propKeyMap);

  const componentCount = propKeyMap.size;
  const totalProps = [...propKeyMap.values()].reduce(
    (sum, m) => sum + m.size,
    0,
  );
  const totalCandidates = [...propKeyMap.values()].reduce(
    (sum, m) =>
      [...m.values()].reduce((s, e) => s + e.candidates.length, sum),
    0,
  );

  console.log(`   Mapped ${totalProps} prop(s) across ${componentCount} component(s)`);
  console.log(`   Resolved ${totalCandidates} total candidate(s)`);

  const outputPath = path.resolve(root, output);
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const json = serialisePropKeyMap(propKeyMap);
  fs.writeFileSync(outputPath, JSON.stringify(json, null, 2), "utf-8");

  console.log(`\n✅ Prop map written to: ${path.relative(root, outputPath)}`);
  console.log(`   Tip: add .i18n-studio/ to your .gitignore\n`);
}
