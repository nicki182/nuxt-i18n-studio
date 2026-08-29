import type { ScriptVariableMap } from "@ast/types";
import type { VariableDeclarator, Identifier, Node, Program } from "estree";

import { TSParser } from "@ast/parser";
import { walk } from "zimmerframe";

import { referencesPropsAccess } from "./helper";

/**
 * Builds a set of property references by analyzing the provided prop name, script variable map, and script code.
 * @param propName - The name of the property to build references for.
 * @param scriptVariableMap - A map of script variables and their associated values.
 * @param scriptCode - The source code of the script to analyze.
 * @returns {Set<string>} - A set of property references that include the original prop name, its `props.` accessors, and any variables referencing it.
 */
export function buildPropRefs(
  propName: string,
  scriptVariableMap: ScriptVariableMap,
  scriptCode: string,
): Set<string> {
  const refs = new Set<string>([propName]);

  // Already tracked as __PROP__ in scriptVariableMap
  // e.g. "header" → ["__PROP__"]
  if (scriptVariableMap.get(propName)?.includes("__PROP__")) {
    refs.add(propName);
  }

  // Templates may consume the prop via the props object: {{ props.text }}.
  // Add accessor forms whenever the script declares props via defineProps.
  if (/defineProps\s*[<(]/.test(scriptCode)) {
    refs.add(`props.${propName}`);
    refs.add(`props?.${propName}`);
  }

  // Walk script AST to find vars that reference props.{propName} anywhere
  try {
    const ast = TSParser.parse(scriptCode, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
    }) as unknown as Program;

    walk(ast, refs, {
      _(node: Node, { state: refs, next }) {
        next();

        if (node.type !== "VariableDeclarator") return;
        const decl = node as VariableDeclarator;
        if (decl.id.type !== "Identifier") return;
        const varName = (decl.id as Identifier).name;

        // Check if this variable's init references props.{propName} anywhere
        if (decl.init && referencesPropsAccess(decl.init, propName)) {
          refs.add(varName);
        }
      },
    });
  } catch {
    // parse failure — use what we have
  }

  return refs;
}
