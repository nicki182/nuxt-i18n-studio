import type { ScanContext, TracePayload } from "@ast/types";

import { toPascalCase } from "@utils";

import { isDirectiveNode } from "./helper";
import { visitPropChain } from "./visitPropChains";
/**
 * Check if a node is a component and record it as a candidate if it matches the provided prop references.
 * @param node - The AST node to check.
 * @param propRefs - A set of property references to match against.
 * @param payload - The trace payload containing information about the component and property.
 * @param ctx - The scan context containing the property key map and other relevant data.
 */
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
