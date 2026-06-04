#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import type {
  PropKeyMap,
  ScriptVariableMap,
  TemplateVariableMap,
} from "../ast/types";

import { parseSfc } from "../ast/parseSfc";
import { mapScriptState } from "../ast/script/mapScriptState";
import { mapScriptTranslations } from "../ast/script/mapScriptTranslations";
import { scanComponentPropKeys } from "../ast/template/scanComponentPropKeys";

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

// ── Per-file cache entry ──────────────────────────────────────────────────────

interface FileCache {
  componentName: string;
  scriptVariableMap: ScriptVariableMap;
  templateVariableMap: TemplateVariableMap;
  templateContent: string | null;
}

function buildFileCache(files: string[]): FileCache[] {
  const cache: FileCache[] = [];

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

    const scriptVariableMap = scriptContent
      ? mapScriptState(scriptContent)
      : new Map<string, string[]>();

    const templateVariableMap = scriptContent
      ? mapScriptTranslations(scriptContent)
      : new Map<string, never>();

    cache.push({
      componentName,
      scriptVariableMap,
      templateVariableMap,
      templateContent,
    });
  }

  return cache;
}

// ── Stabilisation loop ────────────────────────────────────────────────────────

function runStabilisationLoop(
  cache: FileCache[],
  propKeyMap: PropKeyMap,
): number {
  const MAX_PASSES = 10;
  let passes = 0;

  for (let i = 0; i < MAX_PASSES; i++) {
    passes++;
    let changed = false;

    for (const {
      componentName,
      scriptVariableMap,
      templateVariableMap,
      templateContent,
    } of cache) {
      if (!templateContent) continue;

      const didChange = scanComponentPropKeys(
        templateContent,
        scriptVariableMap,
        templateVariableMap,
        propKeyMap,
        componentName,
      );

      if (didChange) changed = true;
    }

    if (!changed) break;
  }

  return passes;
}

// ── Serialise propKeyMap → plain JSON ─────────────────────────────────────────

function serialisePropKeyMap(
  propKeyMap: PropKeyMap,
): Record<string, Record<string, string[]>> {
  const out: Record<string, Record<string, string[]>> = {};

  for (const [component, propMap] of propKeyMap) {
    out[component] = {};
    for (const [propName, keys] of propMap) {
      if (keys.length > 0) {
        out[component][propName] = keys;
      }
    }
    if (Object.keys(out[component]).length === 0) {
      delete out[component];
    }
  }

  return out;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function runAnalyze(options: { root: string; output: string }): void {
  const { root, output } = options;

  console.log("\n🔍 i18n-Studio: Analyzing component prop chains...\n");

  // 1. Collect all .vue files
  const files = collectVueFiles(root);
  console.log(`   Found ${files.length} Vue files`);

  if (files.length === 0) {
    console.log("   No Vue files found. Nothing to analyze.\n");
    return;
  }

  // 2. Build per-file caches
  const cache = buildFileCache(files);

  // 3. Run stabilisation loop
  const propKeyMap: PropKeyMap = new Map();
  const passes = runStabilisationLoop(cache, propKeyMap);

  const componentCount = propKeyMap.size;
  const totalProps = [...propKeyMap.values()].reduce(
    (sum, m) => sum + m.size,
    0,
  );

  console.log(`   Stabilised in ${passes} pass${passes === 1 ? "" : "es"}`);
  console.log(
    `   Mapped ${totalProps} prop(s) across ${componentCount} component(s)`,
  );

  // 4. Write output
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
