import type {
  FunctionDeclaration,
  Identifier,
  Node,
  Program,
  VariableDeclarator,
} from "estree";

import { walk } from "zimmerframe";

import type { TemplateVariableMap } from "../types";

import { TSParser } from "../parser";
import { nodeResolver } from "./resolver/nodeResolver";

/**
 *
 * @param scriptCode
 */
export function mapScriptTranslations(scriptCode: string): TemplateVariableMap {
  const map: TemplateVariableMap = new Map();

  let ast: Program;
  try {
    ast = TSParser.parse(scriptCode, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
    }) as unknown as Program;
  } catch {
    return map;
  }

  walk(ast, map, {
    _(node: Node, { state: map, next }) {
      next();

      // Extract the variable name before delegating to nodeResolver
      // TemplateVariableMap must be keyed by identifier name, not by entry.id
      let varName: string | null = null;

      if (node.type === "VariableDeclarator") {
        const decl = node as VariableDeclarator;
        if (decl.id.type === "Identifier") {
          varName = (decl.id as Identifier).name;
        }
      } else if (node.type === "FunctionDeclaration") {
        const fn = node as FunctionDeclaration;
        if (fn.id) varName = fn.id.name;
      }

      if (!varName) return;

      const resolvers = nodeResolver({ node, source: scriptCode });
      if (!resolvers.length) return;

      const existing = map.get(varName) ?? [];
      map.set(varName, [...existing, ...resolvers]);
    },
  });

  return map;
}
