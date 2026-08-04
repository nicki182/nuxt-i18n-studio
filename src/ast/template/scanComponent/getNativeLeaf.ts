import type { PropCandidate, TracePayload } from "@ast/types";
import type { ElementNode } from "@vue/compiler-dom";

import { isDirectiveNode, hasChildren, isInterpolationNode } from "./helper";

/**
 * Returns a PropCandidate if the native leaf element matches a prop reference, otherwise null.
 * @param node - The ElementNode to inspect.
 * @param propRefs - A set of property references to match against.
 * @param payload - The trace payload containing component and prop context.
 * @returns {PropCandidate | null} - The matched candidate, or null if no match.
 */
export function getNativeLeafCandidate(
  node: ElementNode,
  propRefs: Set<string>,
  payload: TracePayload,
): PropCandidate | null {
  // Interpolations (e.g., <span>{{ msg }}</span>)
  if (hasChildren(node)) {
    for (const child of node.children) {
      if (isInterpolationNode(child)) {
        const expr = child.content?.loc?.source?.trim();
        if (expr && propRefs.has(expr)) {
          return {
            key: payload.key,
            path: payload.sourcePath,
            componentInitial: payload.componentInitial,
            componentEnd: payload.componentName,
            propName: payload.propName,
            element: node.tag,
          };
        }
      }
    }
  }

  // Bound attributes (e.g., <img :alt="msg" />)
  for (const prop of node.props) {
    if (!isDirectiveNode(prop) || prop.name !== "bind" || !prop.exp) continue;
    const expression = prop.exp.loc?.source?.trim();
    if (expression && propRefs.has(expression)) {
      const attrName = prop.arg?.content ?? "unknown";
      return {
        key: payload.key,
        path: payload.sourcePath,
        componentInitial: payload.componentInitial,
        componentEnd: payload.componentName,
        propName: payload.propName,
        element: `${node.tag}[${attrName}]`,
      };
    }
  }

  return null;
}
