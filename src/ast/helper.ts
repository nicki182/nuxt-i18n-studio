import type { DirectiveNode } from "@vue/compiler-dom";

import { NodeTypes } from "@vue/compiler-dom";

import type { PayloadEntry } from "./types";

/**
 * Helper functions for AST processing, including utilities for managing maps and arrays during key extraction and transformation processes.
 * @param map The Map object to which the key-value pair should be added.
 * @param key The key under which the value should be stored in the map.
 * @param value The value to be added to the array corresponding to the key in the map.
 */
export function addToMap(
  map: Map<string, string[]>,
  key: string,
  value: string,
) {
  if (!map.has(key)) map.set(key, []);
  const arr = map.get(key)!;
  if (!arr.includes(value)) arr.push(value);
}

/**
 *
 * @param entries
 */
export function injectDirective(entries: PayloadEntry[]): DirectiveNode {
  // Base64 encode so Vue's compiler never chokes on special characters.
  // CRITICAL: wrap in quotes so Vue emits a string literal into the render
  // function, not a bare identifier. Without quotes, SSR crashes with
  // "W3sidHlw..." is not defined" because it looks like a JS variable name.
  const quotedPayload = `'${btoa(JSON.stringify(entries))}'`;

  const locStub = {
    source: quotedPayload,
    start: { offset: 0, line: 1, column: 1 },
    end: { offset: 0, line: 1, column: 1 },
  };

  return {
    type: NodeTypes.DIRECTIVE,
    name: "i18n-studio",
    modifiers: [],
    exp: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: quotedPayload,
      // Always static — the string never changes, only what the directive
      // does with it at runtime. Avoids unnecessary Vue re-evaluation.
      isStatic: true,
      constType: 3, // ConstantTypes.CAN_STRINGIFY
      loc: locStub,
    },
    loc: locStub,
  } as unknown as DirectiveNode;
}
