import { walk } from "zimmerframe";

import type { ExtractedKey, ValueMap } from "./types";

import { TSParser } from "./parser";
import { nodeResolver } from "./resolver";

export function extractI18nArguments(
  code: string,
  valueMap: ValueMap = new Map(),
): ExtractedKey[] {
  const results: ExtractedKey[] = [];

  try {
    const wrapped = `(function(){return ${code}})()`;
    const ast = TSParser.parse(wrapped, {
      ecmaVersion: "latest",
      locations: true,
    }) as any;

    walk(ast, { results, valueMap, wrapped }, {
      _(node: any, { state, next }) {
        next();

        if (node.type !== "CallExpression") return;

        const isT = node.callee?.name === "$t" || node.callee?.name === "t";
        const isMemberT =
          node.callee?.type === "MemberExpression" &&
          (node.callee.property?.name === "t" ||
            node.callee.property?.name === "$t");

        if (!(isT || isMemberT) || !node.arguments?.length) return;

        const firstArg = node.arguments[0];
        const argSource = state.wrapped.slice(firstArg.start, firstArg.end);

        const resolved = nodeResolver({
          node: firstArg,
          rawSource: argSource,
          valueMap: state.valueMap,
        });
        if (resolved) {
          results.push(...resolved);
        }
      },
    });
  } catch (e) {
    console.log("[i18n Studio] extractI18nArguments: FAILED:", e);
  }

  // Deduplicate by key — nodeResolver may produce the same key
  // from multiple resolution paths (e.g. traced + static both emit 'home.foo')
  const seen = new Set<string>();
  return results.filter((entry) => {
    const id = entry.id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
