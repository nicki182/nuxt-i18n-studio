import type { ElementCacheEntry, ScanContext } from "@ast/types";

import { logger, toPascalCase, toCamelCase } from "@utils";
import { NodeTypes, parse } from "@vue/compiler-dom";

import { isElementNode, isDirectiveNode, hasChildren } from "./helper";

/**
 * A prop binding found on a component tag.
 * Bound props keep their raw expression; static key-like attrs are
 * wrapped in a synthetic t() call so the existing pipeline resolves them.
 */
export interface LayerPropBinding {
  propName: string;
  expression: string;
}

/**
 * One layer of a component tree.
 * - `entry` is the component rendered at this layer.
 * - `propsSent` are the bindings the PARENT layer passed into it.
 * - `sourceEntry` owns the template where `propsSent` were written
 *   (needed to resolve expressions against the correct scriptVariableMap).
 */
export interface ComponentTreeLayer {
  componentName: string;
  entry: ElementCacheEntry;
  sourceEntry: ElementCacheEntry;
  propsSent: LayerPropBinding[];
  children: ComponentTreeLayer[];
}

/**
 * Extracts every prop sent to a component element node.
 * Handles both bound props (:prop="expression") and static attributes
 * whose value looks like a dotted i18n key (header="i18n.pages.x.y").
 */
function getSentProps(node: unknown): LayerPropBinding[] {
  const bindings: LayerPropBinding[] = [];
  if (!isElementNode(node)) return bindings;

  // Bound props: :prop="expression"
  for (const prop of node.props) {
    if (
      !isDirectiveNode(prop) ||
      prop.name !== "bind" ||
      !prop.arg ||
      !prop.exp
    )
      continue;

    const propName = toCamelCase(prop.arg.content);
    const expression = prop.exp.loc?.source?.trim();
    if (propName && expression) bindings.push({ propName, expression });
  }

  // Static key attrs: header="i18n.pages.index.get_active_header"
  for (const prop of node.props) {
    if (prop.type === NodeTypes.ATTRIBUTE && prop.value?.content) {
      const v = prop.value.content.trim();
      // heuristic: looks like an i18n key (dotted path, no spaces)
      if (/^[\w][\w.-]+$/.test(v) && v.includes(".")) {
        bindings.push({
          propName: toCamelCase(prop.name),
          expression: `t('${v}')`,
        });
      }
    }
  }

  return bindings;
}

/**
 * Builds the component tree for a file entry, one layer per nested component.
 * Native elements are traversed in place — only components create a new layer.
 * Cycle-safe via ctx.visited (per-file guard).
 * @param entry - The component whose template defines this layer.
 * @param ctx - The scanning context (lookups and visited tracking only).
 * @param sourceEntry - The file whose template rendered this component.
 * @param propsSent - The bindings the parent layer passed into this component.
 * @returns {ComponentTreeLayer} - The root layer of this component's tree.
 */
export function buildComponentTree(
  entry: ElementCacheEntry,
  ctx: ScanContext,
  sourceEntry: ElementCacheEntry = entry,
  propsSent: LayerPropBinding[] = [],
): ComponentTreeLayer {
  const layer: ComponentTreeLayer = {
    componentName: entry.componentName,
    entry,
    sourceEntry,
    propsSent,
    children: [],
  };

  if (!entry.templateContent) return layer;

  let root: unknown;
  try {
    root = parse(entry.templateContent);
  } catch {
    logger.warn(
      `Failed to parse template for ${entry.componentName} (${entry.filePath}). Skipping subtree.`,
    );
    return layer;
  }

  collectChildLayers(root, entry, ctx, layer);
  return layer;
}

/**
 * Walks a template subtree collecting child component layers.
 * Component elements create child layers; everything else is traversed in place.
 * Slot content of a component element stays on the CURRENT layer (it belongs
 * to the template being walked), matching the previous scanning behaviour.
 */
function collectChildLayers(
  node: unknown,
  currentEntry: ElementCacheEntry,
  ctx: ScanContext,
  layer: ComponentTreeLayer,
): void {
  if (isElementNode(node) && node.tagType === 1 && node.tag) {
    const componentName = toPascalCase(node.tag);
    const childEntry = ctx.byComponentName.get(componentName);
    const propsSent = getSentProps(node);

    const treeHash = childEntry ? `__tree__${childEntry.filePath}` : null;

    if (childEntry && treeHash && !ctx.visited.has(treeHash)) {
      ctx.visited.add(treeHash);
      layer.children.push(
        buildComponentTree(childEntry, ctx, currentEntry, propsSent),
      );
    } else {
      // Unknown component or already-expanded one — still record the layer so
      // the verifier sees the props sent at THIS usage site.
      layer.children.push({
        componentName,
        entry: childEntry ?? currentEntry,
        sourceEntry: currentEntry,
        propsSent,
        children: [],
      });
    }
    // No return: slot children below this tag belong to the current layer.
  }

  if (hasChildren(node)) {
    for (const child of node.children) {
      collectChildLayers(child, currentEntry, ctx, layer);
    }
  }
}
