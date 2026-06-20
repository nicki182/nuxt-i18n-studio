import type { VariableDeclarator, Identifier, Node, Program } from "estree";

import { walk } from "zimmerframe";

import type { ScriptVariableMap } from "../../types";

import { TSParser } from "../../parser";

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

  // Walk script AST to find vars that reference props.{propName}
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

function referencesPropsAccess(node: unknown, propName: string): boolean {
  if (!node || typeof node !== "object") return false;
  const n = node as Record<string, unknown>;

  // props.header or props?.header
  if (
    n["type"] === "MemberExpression" &&
    (n["object"] as Record<string, unknown>)?.["type"] === "Identifier" &&
    (n["object"] as Record<string, unknown>)?.["name"] === "props" &&
    (n["property"] as Record<string, unknown>)?.["type"] === "Identifier" &&
    (n["property"] as Record<string, unknown>)?.["name"] === propName
  ) {
    return true;
  }

  // Recurse into all child nodes
  for (const key of Object.keys(n)) {
    const child = n[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (referencesPropsAccess(item, propName)) return true;
      }
    } else if (referencesPropsAccess(child, propName)) {
      return true;
    }
  }

  return false;
}
