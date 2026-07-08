import type { ScriptResolvableNode, TemplateVariableMap } from "@ast/types";
import type {
  FunctionDeclaration,
  Identifier,
  Node,
  Program,
  VariableDeclarator,
  AssignmentExpression,
  MemberExpression,
} from "estree";

import { TSParser } from "@ast/parser";
import { walk } from "zimmerframe";

import { nodeResolver } from "./resolver/nodeResolver";

/**
 * Maps script translations by analyzing the provided script code and extracting translation keys.
 * @param scriptCode The raw JavaScript/TypeScript code to analyze for translation keys.
 * @returns A TemplateVariableMap where each key is a variable name and the value is an array of ScriptResolver objects representing the extracted translation keys.
 */
export function mapScriptTranslations(scriptCode: string): TemplateVariableMap {
  const map: TemplateVariableMap = new Map();

  let ast: Program;
  try {
    ast = TSParser.parse(scriptCode, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
      ranges: true,
    }) as unknown as Program;
  } catch {
    return map;
  }

  walk(ast, map, {
    _(node: Node, { state: map, next }) {
      next();
      let varName: string | undefined;

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
        if (assign.left.type === "Identifier") {
          varName = assign.left.name;
        } else if (
          assign.left.type === "MemberExpression" &&
          (assign.left as MemberExpression).object.type === "Identifier" &&
          (assign.left as MemberExpression).property.type === "Identifier" &&
          ((assign.left as MemberExpression).property as Identifier).name === "value"
        ) {
          varName = ((assign.left as MemberExpression).object as Identifier).name;
        }
      }

      if (!varName) return;

      // Safe — varName is only set for the three ScriptResolvableNode types above
      const resolvers = nodeResolver({ node: node as ScriptResolvableNode, source: scriptCode });
      if (!resolvers.length) return;

      const existing = map.get(varName) ?? [];
      map.set(varName, [...existing, ...resolvers]);
    },
  });

  return map;
}
