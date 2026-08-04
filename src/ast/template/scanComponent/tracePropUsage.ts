import type { PropCandidate, TracePayload } from "@ast/types";

import { getNativeLeafCandidate } from "./getNativeLeaf";
import { getForwardedProp } from "./getPropForwarding";
import { isElementNode, hasChildren } from "./helper";

/**
 * Recursively traces the usage of a property within a Vue template AST node and its children.
 * Returns all matched candidates without writing to any map.
 * @param node - The current AST node to trace.
 * @param propRefs - A set of property references to match against.
 * @param payload - The trace payload containing information about the component and property.
 * @param resolveForwardedChain - Callback to resolve a forwarded prop into candidates (provided by visitPropChain).
 * @returns {PropCandidate[]} - All matched candidates found in this subtree.
 */
export function tracePropUsage(
  node: unknown,
  propRefs: Set<string>,
  payload: TracePayload,
  resolveForwardedChain: (
    componentName: string,
    propName: string,
  ) => PropCandidate[],
): PropCandidate[] {
  const results: PropCandidate[] = [];

  if (isElementNode(node)) {
    if (node.tagType === 0 && node.tag) {
      const candidate = getNativeLeafCandidate(node, propRefs, payload);
      if (candidate) results.push(candidate);
    } else if (node.tagType === 1 && node.tag) {
      const forwarded = getForwardedProp(node, propRefs);
      if (forwarded) {
        results.push(
          ...resolveForwardedChain(forwarded.componentName, forwarded.propName),
        );
      }
    }
  }

  if (hasChildren(node)) {
    for (const child of node.children) {
      results.push(
        ...tracePropUsage(child, propRefs, payload, resolveForwardedChain),
      );
    }
  }

  return results;
}
