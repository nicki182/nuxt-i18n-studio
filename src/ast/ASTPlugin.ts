import fs from "node:fs";
import path from "node:path";

import type {
  ASTPlugin,
  ScriptVariableMap,
  TemplateVariableMap,
  PropKeyMap,
  ComponentInitialIndex,
} from "./types";

import { PROP_MAP_FILE, PROP_MAP_ROUTE } from "./constants";
import { parseSfc } from "./parseSfc";
import { mapScriptState } from "./script/mapScriptState";
import { mapScriptTranslations } from "./script/mapScriptTranslations";

export function ASTPlugin(): ASTPlugin {
  const valueMapCache = new Map<string, ScriptVariableMap>();
  const templateMapCache = new Map<string, TemplateVariableMap>();
  const propKeyMap: PropKeyMap = new Map();

  // Build-time index: componentInitial → propName → lookup entries
  const componentInitialIndex: ComponentInitialIndex = new Map();

  // Runtime flat index: id → candidate (served to browser)
  const propIdIndex = new Map<string, Record<string, unknown>>();

  function loadPropMap(mapPath: string): void {
    try {
      const raw = fs.readFileSync(mapPath, "utf-8");
      const json = JSON.parse(raw) as {
        byComponentEnd: Record<
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
        >;
        byComponentInitial: Record<
          string,
          Record<
            string,
            { propId: string; element: string; componentEnd: string }[]
          >
        >;
      };

      propKeyMap.clear();
      componentInitialIndex.clear();
      propIdIndex.clear();

      // Load byComponentEnd → propKeyMap + propIdIndex
      for (const [componentName, props] of Object.entries(
        json.byComponentEnd,
      )) {
        const propMapEntry = new Map<
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
        >();

        for (const [propName, entry] of Object.entries(props)) {
          propMapEntry.set(propName, entry);

          // Build flat id index for browser
          for (const candidate of entry.candidates) {
            propIdIndex.set(candidate.id, candidate);
          }
        }

        propKeyMap.set(componentName, propMapEntry);
      }

      // Load byComponentInitial → componentInitialIndex
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
      console.log(
        `[i18n-Studio] Loaded prop map: ${propKeyMap.size} components, ${totalProps} props, ${propIdIndex.size} ids`,
      );
    } catch {
      // No prop-map.json yet — silent fallback
    }
  }

  function buildFlatIndex(): string {
    const index: Record<string, unknown> = {};
    for (const [id, candidate] of propIdIndex) {
      index[id] = candidate;
    }
    return JSON.stringify(index);
  }

  return {
    name: "vite-plugin-ast-i18n-studio",
    enforce: "pre",

    buildStart() {
      const mapPath = path.resolve(process.cwd(), PROP_MAP_FILE);
      loadPropMap(mapPath);
    },

    // Serve flat id index in dev
    configureServer(server) {
      server.middlewares.use(PROP_MAP_ROUTE, (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(buildFlatIndex());
      });
    },

    // Copy flat id index to public/ for production
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

      const scriptVariableMap = scriptContent
        ? mapScriptState(scriptContent)
        : new Map<string, string[]>();

      const templateVariableMap = scriptContent
        ? mapScriptTranslations(scriptContent)
        : new Map<string, never>();

      valueMapCache.set(id, scriptVariableMap);
      templateMapCache.set(id, templateVariableMap);

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

    get _valueMapCache() {
      return valueMapCache;
    },
    get _templateMapCache() {
      return templateMapCache;
    },
    get _propKeyMap() {
      return propKeyMap;
    },
    get _componentInitialIndex() {
      return componentInitialIndex;
    },
  };
}
