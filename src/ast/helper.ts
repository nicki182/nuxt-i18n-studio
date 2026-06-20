import type {
  DirectiveNode,
  ElementNode,
  InterpolationNode,
  AttributeNode,
} from "@vue/compiler-dom";
import type {
  Node,
  Identifier,
  CallExpression,
  MemberExpression,
} from "estree";

import { NodeTypes } from "@vue/compiler-dom";

import type { PayloadEntry, ScriptVariableMap, TemplateVariableMap, WrappableElementNode } from "./types";

import { extractTemplateTranslations } from "./template";

export function addToMap(
  map: Map<string, string[]> = new Map(),
  key: string,
  value: string,
) {
  if (!map.has(key)) map.set(key, []);
  const arr = map.get(key)!;
  if (!arr.includes(value)) arr.push(value);
}

/**
 * Injects the v-i18n-studio directive AND a data-i18n-id attribute on the
 * same element. The UUID on data-i18n-id lets the fragment-recovery mixin
 * find the exact DOM element via querySelector even when Vue drops the
 * directive due to a fragment root — no subtree walking needed.
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
  const uuid = generateUUID();

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
 * Simple UUID v4 generator — runs at build time only, no runtime cost.
 * Uses crypto.randomUUID when available (Node 16+), falls back to Math.random.
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function hasTemplateVariableRef(
  el: ElementNode,
  templateVariableMap: TemplateVariableMap,
): boolean {
  for (const childNode of el.children) {
    if (childNode.type !== NodeTypes.INTERPOLATION) continue;
    const interp = childNode as InterpolationNode;
    const expression = interp.content?.loc?.source ?? "";
    if (expression && templateVariableMap.has(expression.trim())) return true;
  }

  for (const propNode of el.props) {
    if (propNode.type !== NodeTypes.DIRECTIVE) continue;
    const prop = propNode as DirectiveNode;
    if (prop.name !== "bind" || !prop.exp) continue;
    const expression = prop.exp.loc?.source ?? "";
    if (expression && templateVariableMap.has(expression.trim())) return true;
  }

  return false;
}

export function isTCall(node: Node): boolean {
  if (node.type !== "CallExpression") return false;
  const call = node as CallExpression;
  if (call.callee.type === "Identifier") {
    const name = (call.callee as Identifier).name;
    return name === "t" || name === "$t";
  }
  if (call.callee.type === "MemberExpression") {
    const member = call.callee as MemberExpression;
    if (!member.computed && member.property.type === "Identifier") {
      const propName = (member.property as Identifier).name;
      return propName === "t" || propName === "$t";
    }
  }
  return false;
}

export function extractKeysFromExpression(
  expression: string,
  scriptVariableMap: ScriptVariableMap,
): string[] {
  const keys: string[] = [];
  for (const entry of extractTemplateTranslations(
    expression,
    scriptVariableMap,
  )) {
    if ("key" in entry && entry.key) keys.push(entry.key);
    if ("allCandidates" in entry) {
      (entry.allCandidates as { key: string }[]).forEach((c) => {
        if (c.key) keys.push(c.key);
      });
    }
  }
  return [...new Set(keys)];
}

export function injectI18nDirective(el: WrappableElementNode, payload: PayloadEntry[]) {
  el.__i18nWrapped = true;
  const [directiveNode, idAttrNode] = injectDirective(payload);
  el.props.push(directiveNode, idAttrNode);
}

export function toPascalCase(filename: string): string {
  return filename
    .replace(/[-_](.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (_, c: string) => c.toUpperCase());
}

export function toSlug(componentName: string): string {
  const initials = componentName.match(/[A-Z]/g)?.join("").toLowerCase();
  return initials ?? componentName.toLowerCase().slice(0, 4);
}

export function generateCandidateId(componentName: string, propName: string, index: number): string {
  const slug = toSlug(componentName);
  const safeProp = propName.replace(/[^a-zA-Z0-9]/g, "_");
  return `${slug}__${safeProp}__${index}`;
}
