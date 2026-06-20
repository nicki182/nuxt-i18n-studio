import type { ScanContext, TracePayload } from "../../types";

import { isDirectiveNode, toPascalCase } from "../../helper";
import { visitPropChain } from "./visitPropChains";

export function checkPropForwarding(
  node: any,
  propRefs: Set<string>,
  payload: TracePayload,
  ctx: ScanContext,
): void {
  for (const prop of node.props) {
    if (
      !isDirectiveNode(prop) ||
      prop.name !== "bind" ||
      !prop.arg ||
      !prop.exp
    )
      continue;

    const childPropName = prop.arg.content;
    const expression = prop.exp.loc?.source?.trim();

    if (childPropName && expression && propRefs.has(expression)) {
      const componentName = toPascalCase(node.tag); // <-- Normalize child component tag

      // Loop the recursion backwards into Phase 2
      visitPropChain(ctx, {
        ...payload,
        componentName: componentName, // <-- Use normalized name
        propName: childPropName,
      });
      return;
    }
  }
}
