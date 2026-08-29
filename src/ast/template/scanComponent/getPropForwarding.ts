import type { ElementNode } from "@vue/compiler-dom";

import { toCamelCase, toPascalCase } from "@utils";

import { isDirectiveNode } from "./helper";

/**
 * Returns the forwarded component name and prop name if the node passes a matching
 * prop reference to a child component, otherwise null.
 * Prop names are normalized to camelCase so kebab-case bindings
 * (:image-alt-text) resolve against their camelCase declarations (imageAltText).
 * @param node - The ElementNode to inspect.
 * @param propRefs - A set of property references to match against.
 * @returns {{ componentName: string; propName: string } | null} Returns the forwarded prop info or null if not found.
 */
export function getForwardedProp(
  node: ElementNode,
  propRefs: Set<string>,
): { componentName: string; propName: string } | null {
  for (const prop of node.props) {
    if (
      !isDirectiveNode(prop) ||
      prop.name !== "bind" ||
      !prop.arg ||
      !prop.exp
    )
      continue;

    const childPropName = toCamelCase(prop.arg.content);
    const expression = prop.exp.loc?.source?.trim();

    if (childPropName && expression && propRefs.has(expression)) {
      return {
        componentName: toPascalCase(node.tag),
        propName: childPropName,
      };
    }
  }

  return null;
}
