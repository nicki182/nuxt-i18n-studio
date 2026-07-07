import type { ScanContext, TracePayload } from "@ast/types";

import { checkNativeLeaf } from "./checkNativeLeaf";
import { checkPropForwarding } from "./checkPropForwarding";
import { isElementNode, hasChildren } from "./helper";

/**
 * Recursively traces the usage of a property within a Vue template AST node and its children.
 * @param node - The current AST node to trace.
 * @param propRefs - A set of property references to match against.
 * @param payload - The trace payload containing information about the component and property.
 * @param ctx - The scan context containing the property key map and other relevant data.
 */
export function tracePropUsage(
  node: unknown,
  propRefs: Set<string>,
  payload: TracePayload,
  ctx: ScanContext,
): void {
  if (isElementNode(node)) {
    if (node.tagType === 0 && node.tag) {
      checkNativeLeaf(node, propRefs, payload, ctx);
    } else if (node.tagType === 1 && node.tag) {
      checkPropForwarding(node, propRefs, payload, ctx);
    }
  }

  if (hasChildren(node)) {
    node.children.forEach((child) =>
      tracePropUsage(child, propRefs, payload, ctx),
    );
  }
}
