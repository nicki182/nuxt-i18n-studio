import type {
  CallExpression,
  Identifier,
  MemberExpression,
  Node,
} from "estree";
/**
 * Verifies if a given AST node represents a call to the translation function (t or $t).
 * @param node - The AST node to check.
 * @returns {boolean} - True if the node is a call to t or $t, false otherwise.
 */
export function isTCall(node: Node): boolean {
  if (node.type !== "CallExpression") return false;
  const call = node as CallExpression;
  if (call.callee.type === "Identifier") {
    const name = (call.callee as Identifier).name;
    return name === "t" || name === "$t";
  }
  if (call.callee.type === "MemberExpression") {
    const member = call.callee as MemberExpression;
    if (!member.computed && member.property.type === "Identifier") {
      const propName = (member.property as Identifier).name;
      return propName === "t" || propName === "$t";
    }
  }
  return false;
}
