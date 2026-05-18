import type { Node, Program } from "estree";

import { walk } from "zimmerframe";

import type { ScriptVariableMap } from "../types";

import { addToMap } from "../helper";
import { TSParser } from "../parser";
import { harvestValuesByNodeType } from "./harvest";

/**
 * Parses a <script setup> block and builds a ScriptVariableMap —
 * a record of every identifier and function name mapped to all static
 * string values it can possibly hold or return.
 * @param scriptCode - The code of the <script setup> block to analyze
 * @returns A map of identifiers and function names to their possible string values
 */
export function mapScriptState(scriptCode: string): ScriptVariableMap {
  const map: ScriptVariableMap = new Map();

  try {
    const ast = TSParser.parse(scriptCode, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
    }) as unknown as Program;

    walk(ast, map, {
      _(node: Node, { state: map, next }) {
        // Recurse into children before processing the current node
        next();

        const values = harvestValuesByNodeType(node);

        values.forEach(({ name, value, isProp }) => {
          if (isProp) {
            // __PROP__ is a sentinel — always overwrite, never accumulate
            map.set(name, ["__PROP__"]);
            return;
          }
          addToMap(map, name, value);
        });
      },
    });

    return map;
  } catch (e) {
    console.error(
      "[i18n Studio] mapScriptState: failed to parse script code:",
      e,
    );
    return map;
  }
}
