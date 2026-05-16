import { walk } from "zimmerframe";

import type { ValueMap } from "./types";

import { harvestValuesByNodeType } from "./harvest";
import { addToMap } from "./helper";
import { TSParser } from "./parser";

export function buildScriptValueMap(scriptCode: string): ValueMap {
  const map: ValueMap = new Map();
  try {
    const ast = TSParser.parse(scriptCode, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
    });

    walk(ast, map, {
      // ── universal visitor: visits every node, we filter by type ──────────────
      // This is the correct zimmerframe pattern — the named visitor approach
      // only fires for top-level node types, not recursed ones. The _ visitor
      // fires for ALL nodes unconditionally.
      _(node: any, { state: map, next }) {
        // Always recurse into children first
        next();

        const values = harvestValuesByNodeType(node);
        values.forEach(({ name, value, isProp }) => {
          if (isProp) {
            map.set(name, ["__PROP__"]);
            return;
          }
          addToMap(map, name, value);
        });
      },
    });

    return map;
  } catch (e) {
    console.log(
      "[i18n Studio] buildScriptValueMap: FAILED to parse script code:",
      e,
    );
    return map;
  }
}
