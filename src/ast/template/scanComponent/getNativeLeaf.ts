import type { PropCandidate, TracePayload } from "@ast/types";
import type { ElementNode } from "@vue/compiler-dom";

import { isDirectiveNode, hasChildren, isInterpolationNode } from "./helper";

/**
 * Unwraps a single leading $t(...) / t(...) call so that `t(header)` can match
 * a prop-ref set containing `header`. Returns the inner source, or the original
 * expression if it is not a t() call.
 */
function unwrapTCall(expr: string): string {
  const trimmed = expr.trim();
  const prefix = trimmed.startsWith("$t(")
    ? "$t("
    : trimmed.startsWith("t(")
      ? "t("
      : null;

  if (!prefix || !trimmed.endsWith(")")) return expr;

  const inner = trimmed.slice(prefix.length, -1);
  return inner.length > 0 ? inner.trim() : expr;
}

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
  // Interpolations (e.g., <span>{{ msg }}</span>, <h2>{{ t(header) }}</h2>)
  if (hasChildren(node)) {
    for (const child of node.children) {
      if (isInterpolationNode(child)) {
        const expr = child.content?.loc?.source?.trim();
        if (expr && (propRefs.has(expr) || propRefs.has(unwrapTCall(expr)))) {
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

  // Bound attributes (e.g., <img :alt="t(imageAltText)" />)
  for (const prop of node.props) {
    if (!isDirectiveNode(prop) || prop.name !== "bind" || !prop.exp) continue;
    const expression = prop.exp.loc?.source?.trim();
    if (
      expression &&
      (propRefs.has(expression) || propRefs.has(unwrapTCall(expression)))
    ) {
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
