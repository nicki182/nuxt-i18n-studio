import type { ScanContext, TracePayload } from "../../types";

import { isElementNode, hasChildren } from "../../helper";
import { checkNativeLeaf } from "./checkNativeLeaf";
import { checkPropForwarding } from "./checkPropForwarding";

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
