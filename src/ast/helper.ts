import type {
  AttributeNode,
  DirectiveNode
} from "@vue/compiler-dom";

import { toSlug } from "@utils";
import { NodeTypes } from "@vue/compiler-dom";
import { v4 as uuidv4 } from 'uuid';

import type {
  PayloadEntry,
  ScriptVariableMap,
  WrappableElementNode
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
  const safeProp = propName.replace(/[^a-zA-Z0-9]/g, "_");
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

  for (const entry of extractTemplateTranslations(
    expression,
    scriptVariableMap,
  )) {
    if ("key" in entry && entry.key) {
      keys.push(entry.key);
    }
    if ("allCandidates" in entry) {
      (entry.allCandidates as { key: string }[]).forEach((c) => {
        if (c.key) keys.push(c.key);
      });
    }
  }

  return [...new Set(keys)];
}
