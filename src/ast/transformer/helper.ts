import type {
  DirectiveNode,
  ElementNode,
  InterpolationNode
} from "@vue/compiler-dom";

import { NodeTypes } from "@vue/compiler-dom";

import type {
  TemplateVariableMap
} from "../types";

/**
 * Check if an ElementNode has a template variable reference in its children or props.
 * @param el - The ElementNode to check.
 * @param templateVariableMap - A map of template variable references.
 * @returns {boolean} - True if the ElementNode has a template variable reference, false otherwise.
 */
export function hasTemplateVariableRef(
  el: ElementNode,
  templateVariableMap: TemplateVariableMap,
): boolean {
  for (const childNode of el.children) {
    if (childNode.type !== NodeTypes.INTERPOLATION) continue;
    const interp = childNode as InterpolationNode;
    const expression = interp.content?.loc?.source ?? "";
    if (expression && templateVariableMap.has(expression.trim())) return true;
  }

  for (const propNode of el.props) {
    if (propNode.type !== NodeTypes.DIRECTIVE) continue;
    const prop = propNode as DirectiveNode;
    if (prop.name !== "bind" || !prop.exp) continue;
    const expression = prop.exp.loc?.source ?? "";
    if (expression && templateVariableMap.has(expression.trim())) return true;
  }

  return false;
}
