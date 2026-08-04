import type { PropCandidate, PropKeyMap } from "@ast/types";
import type {
  ElementNode,
  InterpolationNode,
  TemplateChildNode,
  DirectiveNode,
  SimpleExpressionNode,
} from "@vue/compiler-dom";

import { NodeTypes } from "@vue/compiler-dom";

/**
 * Check if a node is an ElementNode.
 * @param node - The node to check.
 * @returns {boolean} - True if the node is an ElementNode, false otherwise.
 */
export function isElementNode(node: unknown): node is ElementNode {
  return (
    !!node &&
    typeof node === "object" &&
    "type" in node &&
    node.type === NodeTypes.ELEMENT
  );
}

/**
 * Applies a candidate to the propKeyMap. Only called from buildPropKeyMap — the single writer.
 * @param propKeyMap - The map to write into.
 * @param componentName - The component to record under.
 * @param propName - The prop to record under.
 * @param candidate - The candidate to apply.
 */
export function applyCandidate(
  propKeyMap: PropKeyMap,
  componentName: string,
  propName: string,
  candidate: PropCandidate,
): void {
  if (!propKeyMap.has(componentName)) {
    propKeyMap.set(componentName, new Map());
  }

  const propMap = propKeyMap.get(componentName)!;

  if (!propMap.has(propName)) {
    propMap.set(propName, {
      element: candidate.element,
      candidates: [],
    });
  }

  const entry = propMap.get(propName)!;

  const alreadyExists = entry.candidates.some(
    (c) => c.key === candidate.key && c.path === candidate.path,
  );

  if (!alreadyExists) {
    entry.candidates.push(candidate);
  }
}

/**
 * Check for references to props access in the AST node.
 * @param node - The AST node to check.
 * @param propName - The name of the prop to look for.
 * @returns {boolean} - True if the node references the prop, false otherwise.
 */
export function referencesPropsAccess(
  node: unknown,
  propName: string,
): boolean {
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

/**
 * Check if a node is an InterpolationNode.
 * @param node - The node to check.
 * @returns {boolean} - True if the node is an InterpolationNode, false otherwise.
 */
export function isInterpolationNode(node: unknown): node is InterpolationNode {
  return (
    !!node &&
    typeof node === "object" &&
    (node as InterpolationNode).type === NodeTypes.INTERPOLATION
  );
}

/**
 * Check if a node has children.
 * @param node - The node to check.
 * @returns {boolean} - True if the node has children, false otherwise.
 */
export function hasChildren(
  node: unknown,
): node is { children: TemplateChildNode[] } {
  return (
    !!node &&
    typeof node === "object" &&
    Array.isArray((node as { children?: TemplateChildNode[] }).children)
  );
}

/**
 * Check if a node is a DirectiveNode.
 * @param node - The node to check.
 * @returns {boolean} - True if the node is a DirectiveNode, false otherwise.
 */
export function isDirectiveNode(node: unknown): node is DirectiveNode & {
  arg?: SimpleExpressionNode;
  exp?: SimpleExpressionNode;
} {
  return (
    !!node &&
    typeof node === "object" &&
    (node as DirectiveNode).type === NodeTypes.DIRECTIVE
  );
}
