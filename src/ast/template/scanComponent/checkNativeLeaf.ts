import type { ScanContext, TracePayload } from "@ast/types";

import { recordCandidate,isDirectiveNode,hasChildren,isInterpolationNode } from "./helper";

/**
 * Check if a node is a native leaf element and record it as a candidate if it matches the provided prop references.
 * @param node - The AST node to check.
 * @param propRefs - A set of property references to match against.
 * @param payload - The trace payload containing information about the component and property.
 * @param ctx - The scan context containing the property key map and other relevant data.
 */
export function checkNativeLeaf(
  node: any,
  propRefs: Set<string>,
  payload: TracePayload,
  ctx: ScanContext,
): void {
  // Interpolations (e.g., <span>{{ msg }}</span>)
  if (hasChildren(node)) {
    for (const child of node.children) {
      if (isInterpolationNode(child)) {
        const expr = child.content?.loc?.source?.trim();
        if (expr && propRefs.has(expr)) {
          recordCandidate(
            ctx.propKeyMap,
            payload.componentName,
            payload.propName,
            {
              key: payload.key,
              path: payload.sourcePath,
              componentInitial: payload.componentInitial,
              componentEnd: payload.componentName,
              propName: payload.propName,
              element: node.tag,
            },
          );
          return;
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
      recordCandidate(ctx.propKeyMap, payload.componentName, payload.propName, {
        key: payload.key,
        path: payload.sourcePath,
        componentInitial: payload.componentInitial,
        componentEnd: payload.componentName,
        propName: payload.propName,
        element: `${node.tag}[${attrName}]`,
      });
      return;
    }
  }
}
