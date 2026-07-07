import type { ExtractedKey, ScriptVariableMap } from "@ast/types";
import type {
  Program,
  CallExpression,
  Identifier,
  MemberExpression,
} from "estree";

import { TSParser } from "@ast/parser";
import { walk } from "zimmerframe";

import { nodeResolver } from "./resolver";

/**
 * Parses a JS expression string from a template interpolation or directive
 * binding, finds all $t() / t() calls, and resolves their arguments to
 * ExtractedKey values using the ScriptVariableMap for context.
 * @param code The raw JavaScript expression code to analyze, typically from a template interpolation or directive binding.
 * @param valueMap An optional map of script variables that can be used to resolve identifiers to their values. This is typically populated from the Vite transform hook for the current file.
 * @returns An array of extracted keys, where each key is an object containing the resolved value and associated metadata.
 */
export function extractTemplateTranslations(
  code: string,
  valueMap: ScriptVariableMap = new Map(),
): ExtractedKey[] {
  const results: ExtractedKey[] = [];

  try {
    const wrapped = `(function(){return ${code}})()`;
    const ast = TSParser.parse(wrapped, {
      ecmaVersion: "latest",
      locations: true,
    }) as unknown as Program;

    walk(
      ast,
      { results, valueMap, wrapped },
      {
        _(
          node: Program | CallExpression | Identifier | MemberExpression,
          { state, next },
        ) {
          next();

          if (node.type !== "CallExpression") return;

          const callNode = node as CallExpression;

          const isT =
            callNode.callee.type === "Identifier" &&
            ((callNode.callee as Identifier).name === "$t" ||
              (callNode.callee as Identifier).name === "t");

          const isMemberT =
            callNode.callee.type === "MemberExpression" &&
            (callNode.callee as MemberExpression).property.type ===
              "Identifier" &&
            (((callNode.callee as MemberExpression).property as Identifier)
              .name === "t" ||
              ((callNode.callee as MemberExpression).property as Identifier)
                .name === "$t");

          if (!(isT || isMemberT) || !callNode.arguments.length) return;

          const firstArg = callNode.arguments[0];
          // firstArg.start/end are acorn position properties — present at runtime
          // but not in estree types, so we access via type assertion
          const argStart = (firstArg as unknown as { start: number }).start;
          const argEnd = (firstArg as unknown as { end: number }).end;
          const argSource = state.wrapped.slice(argStart, argEnd);

          const resolved = nodeResolver({
            node: firstArg,
            rawSource: argSource,
            valueMap: state.valueMap,
          });

          state.results.push(...resolved);
        },
      },
    );
  } catch (e) {
    console.error("[i18n Studio] extractTemplateTranslations: FAILED:", e);
  }

  // Deduplicate by id — nodeResolver may produce the same key
  // from multiple resolution paths (e.g. traced + static both emit 'home.foo')
  const seen = new Set<string>();
  return results.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}
