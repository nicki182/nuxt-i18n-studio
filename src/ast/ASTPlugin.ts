import { logger } from "@utils";
import fs from "node:fs";
import path from "node:path";

import type {
  ASTPlugin,
  ScriptVariableMap,
  TemplateVariableMap,
  PropKeyMap,
  ComponentInitialIndex,
  PropComponentJson,
  PropCandidate,
} from "./types";

import { PROP_MAP_FILE, PROP_MAP_ROUTE } from "./constants";
import { parseSfc } from "./parseSfc";
import { mapScriptState } from "./script/mapScriptState";
import { mapScriptTranslations } from "./script/mapScriptTranslations";

// ── State ─────────────────────────────────────────────────────────────────────

const valueMapCache = new Map<string, ScriptVariableMap>();
const templateMapCache = new Map<string, TemplateVariableMap>();
const propKeyMap: PropKeyMap = new Map();
const componentInitialIndex: ComponentInitialIndex = new Map();
const propIdIndex = new Map<string, Record<string, unknown>>();

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadPropMap(mapPath: string): void {
  try {
    const raw = fs.readFileSync(mapPath, "utf-8");
    const json = JSON.parse(raw) as PropComponentJson;

    propKeyMap.clear();
    componentInitialIndex.clear();
    propIdIndex.clear();

    for (const [componentName, props] of Object.entries(json.byComponentEnd)) {
      const propMapEntry = new Map<
        string,
        { element: string; candidates: PropCandidate[] }
      >();

      for (const [propName, entry] of Object.entries(props)) {
        propMapEntry.set(propName, entry);
        for (const candidate of entry.candidates) {
          propIdIndex.set(candidate.id, candidate);
        }
      }

      propKeyMap.set(componentName, propMapEntry);
    }

    for (const [componentInitial, props] of Object.entries(
      json.byComponentInitial,
    )) {
      const propMap = new Map<
        string,
        { propId: string; element: string; componentEnd: string }[]
      >();

      for (const [propName, entries] of Object.entries(props)) {
        propMap.set(propName, entries);
      }

      componentInitialIndex.set(componentInitial, propMap);
    }

    const totalProps = [...propKeyMap.values()].reduce(
      (s, m) => s + m.size,
      0,
    );
    logger.log(
      `[i18n-Studio] Loaded prop map: ${propKeyMap.size} components, ${totalProps} props, ${propIdIndex.size} ids`,
    );
  } catch {
    logger.warn(
      `[i18n-Studio] Failed to load prop map from ${mapPath}. Run 'i18n-studio analyze' to generate it.`,
    );
  }
}

function buildFlatIndex(): string {
  const index: Record<string, unknown> = {};
  for (const [id, candidate] of propIdIndex) {
    index[id] = candidate;
  }
  return JSON.stringify(index);
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export function ASTPlugin(): ASTPlugin {
  return {
    name: "vite-plugin-ast-i18n-studio",
    enforce: "pre",

    buildStart() {
      loadPropMap(path.resolve(process.cwd(), PROP_MAP_FILE));
    },

    configureServer(server) {
      server.middlewares.use(PROP_MAP_ROUTE, (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(buildFlatIndex());
      });
    },

    writeBundle() {
      const outDir = path.resolve(process.cwd(), "public/__i18n_studio");
      try {
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }
        fs.writeFileSync(
          path.join(outDir, "prop-map.json"),
          buildFlatIndex(),
          "utf-8",
        );
      } catch {
        // Skip if public/ not writable
      }
    },

    transform(source, id) {
      if (!id.endsWith(".vue")) return null;
      const { scriptContent } = parseSfc(source);

      valueMapCache.set(
        id,
        scriptContent ? mapScriptState(scriptContent) : new Map<string, string[]>(),
      );
      templateMapCache.set(
        id,
        scriptContent ? mapScriptTranslations(scriptContent) : new Map<string, never>(),
      );

      return null;
    },

    handleHotUpdate({ file }) {
      if (file.endsWith(".vue")) {
        valueMapCache.delete(file);
        templateMapCache.delete(file);
      }
      if (file.endsWith("prop-map.json")) {
        loadPropMap(file);
      }
    },

    get _valueMapCache() { return valueMapCache; },
    get _templateMapCache() { return templateMapCache; },
    get _propKeyMap() { return propKeyMap; },
    get _componentInitialIndex() { return componentInitialIndex; },
  };
}
