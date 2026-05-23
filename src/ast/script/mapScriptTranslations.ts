import type {
  FunctionDeclaration,
  Identifier,
  Node,
  Program,
  VariableDeclarator,
  AssignmentExpression,
  MemberExpression,
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
      ranges: true, // <-- ADD THIS
    }) as unknown as Program;
  } catch {
    return map;
  }

  walk(ast, map, {
    _(node: Node, { state: map, next }) {
      next();
      let varName: string | undefined;
      // Extract the variable name before delegating to nodeResolver
      // TemplateVariableMap must be keyed by identifier name, not by entry.id
      if (node.type === "VariableDeclarator") {
        const decl = node as VariableDeclarator;
        if (decl.id.type === "Identifier") {
          varName = (decl.id as Identifier).name;
        }
      } else if (node.type === "FunctionDeclaration") {
        const fn = node as FunctionDeclaration;
        if (fn.id) varName = fn.id.name;
      } else if (node.type === "AssignmentExpression") {
        const assign = node as AssignmentExpression;
        // Standard variable assignment: greeting = t(...)
        if (assign.left.type === "Identifier") {
          varName = assign.left.name;
        }
        // Vue ref assignment: greeting.value = t(...)
        else if (
          assign.left.type === "MemberExpression" &&
          (assign.left as MemberExpression).object.type === "Identifier" &&
          (assign.left as MemberExpression).property.type === "Identifier" &&
          ((assign.left as MemberExpression).property as Identifier).name ===
            "value"
        ) {
          varName = ((assign.left as MemberExpression).object as Identifier)
            .name;
        }
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
