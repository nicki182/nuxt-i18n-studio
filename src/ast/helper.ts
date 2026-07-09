import type { AttributeNode, DirectiveNode } from "@vue/compiler-dom";

import { toSlug, logger } from "@utils";
import { NodeTypes } from "@vue/compiler-dom";
import fs from "node:fs";
import { v4 as uuidv4 } from "uuid";

import type {
  PayloadEntry,
  ScriptVariableMap,
  WrappableElementNode,
  PropCandidate,
  PropComponentJson,
} from "./types";

import { extractTemplateTranslations } from "./template";

/**
 * Injects the v-i18n-studio directive AND a data-i18n-id attribute on the
 * same element
 * @param entries The payload to encode and inject into the directive.
 * @returns { [DirectiveNode, AttributeNode] } A tuple of [directiveNode, idAttrNode] to push onto the element's props.
 */
export function injectDirective(
  entries: PayloadEntry[],
): [DirectiveNode, AttributeNode] {
  const quotedPayload = `'${btoa(JSON.stringify(entries))}'`;

  const locStub = {
    source: quotedPayload,
    start: { offset: 0, line: 1, column: 1 },
    end: { offset: 0, line: 1, column: 1 },
  };

  const directiveNode: DirectiveNode = {
    type: NodeTypes.DIRECTIVE,
    name: "i18n-studio",
    modifiers: [],
    exp: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: quotedPayload,
      isStatic: true,
      constType: 3,
      loc: locStub,
    },
    loc: locStub,
  } as unknown as DirectiveNode;

  // Stable UUID generated at compile time — ties this directive payload to a
  // specific DOM element regardless of fragment depth at runtime.
  const uuid = uuidv4();

  const idAttrLocStub = {
    source: uuid,
    start: { offset: 0, line: 1, column: 1 },
    end: { offset: 0, line: 1, column: 1 },
  };

  const idAttrNode: AttributeNode = {
    type: NodeTypes.ATTRIBUTE,
    name: "data-i18n-id",
    value: {
      type: NodeTypes.TEXT,
      content: uuid,
      loc: idAttrLocStub,
    },
    loc: idAttrLocStub,
  } as unknown as AttributeNode;

  return [directiveNode, idAttrNode];
}
/**
 * Injects the v-i18n-studio directive AND a data-i18n-id attribute on the
 * same element, and marks the element as wrapped for i18n studio.
 * @param el The ElementNode to inject the directive into.
 * @param payload The payload to encode and inject into the directive.
 */
export function injectI18nDirective(
  el: WrappableElementNode,
  payload: PayloadEntry[],
) {
  el.__i18nWrapped = true;
  const [directiveNode, idAttrNode] = injectDirective(payload);
  el.props.push(directiveNode, idAttrNode);
}

/**
 * Generates a unique candidate ID based on the component name, prop name, and index.
 * @param componentName - The name of the component.
 * @param propName - The name of the prop.
 * @param index - The index of the candidate.
 * @returns {string} - A unique candidate ID.
 */
export function generateCandidateId(
  componentName: string,
  propName: string,
  index: number,
): string {
  const slug = toSlug(componentName);
  const safeProp = propName.replace(/[^a-z-0-9]/gi, "_");
  return `${slug}__${safeProp}__${index}`;
}

/**
 * Extracts translation keys from a given expression using the provided script variable map.
 * @param expression - The expression to extract keys from.
 * @param scriptVariableMap - A map of script variable references.
 * @returns {string[]} - An array of extracted translation keys.
 */
export function extractKeys(
  expression: string,
  scriptVariableMap: ScriptVariableMap,
): string[] {
  const keys: string[] = [];

  for (const entry of extractTemplateTranslations(expression, scriptVariableMap)) {
    if ("key" in entry && entry.key) {
      keys.push(entry.key);
    }
    if ("allCandidates" in entry) {
      for (const candidate of entry.allCandidates) {
        if (candidate) keys.push(candidate);
      }
    }
  }

  return [...new Set(keys)];
}

/**
 * Loads a prop map from a JSON file and populates the provided maps with the data.
 * @param mapPath - The path to the JSON file containing the prop map.
 * @param maps - An object containing the maps to populate: propKeyMap, componentInitialIndex, and propIdIndex.
 * @param maps.propKeyMap - A map of component names to their associated props and candidates.
 * @param maps.componentInitialIndex - An index of initial component prop IDs for quick lookup.
 * @param maps.propIdIndex - A map of prop IDs to their associated candidates.
 * @returns {void}
 */
export function loadPropMap(
  mapPath: string,
  maps: {
    propKeyMap: Map<
      string,
      Map<string, { element: string; candidates: PropCandidate[] }>
    >;
    componentInitialIndex: Map<
      string,
      Map<string, { propId: string; element: string; componentEnd: string }[]>
    >;
    propIdIndex: Map<string, unknown>;
  },
): void {
  try {
    const { propKeyMap, componentInitialIndex, propIdIndex } = maps;
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

    const totalProps = [...propKeyMap.values()].reduce((s, m) => s + m.size, 0);
    logger.log(
      `[i18n-Studio] Loaded prop map: ${propKeyMap.size} components, ${totalProps} props, ${propIdIndex.size} ids`,
    );
  } catch {
    logger.warn(
      `[i18n-Studio] Failed to load prop map from ${mapPath}. Run 'i18n-studio analyze' to generate it.`,
    );
  }
}

export function buildFlatIndex(indexes: Map<string, unknown>): string {
  const index: Record<string, unknown> = {};
  for (const [id, candidate] of indexes) {
    index[id] = candidate;
  }
  return JSON.stringify(index);
}
