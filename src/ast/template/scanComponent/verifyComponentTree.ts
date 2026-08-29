import type { PropCandidate, ScanContext } from "@ast/types";

import { extractKeys } from "@ast/helper";

import type { ComponentTreeLayer } from "./buildComponentTree";

import { visitPropChain } from "./visitPropChains";

/**
 * Walks a component tree layer by layer.
 * Layers sending no key-carrying props are passed through transparently;
 * as soon as a layer sends a prop with resolvable keys, the existing
 * visitPropChain analysis runs for that component — exactly as before.
 * A subtree with nothing until its root contributes no candidates.
 * @param layer - The tree layer to verify.
 * @param ctx - The scanning context (used by visitPropChain for lookups/visited).
 * @returns {PropCandidate[]} - All candidates found in this layer and below.
 */
export function verifyComponentTree(
  layer: ComponentTreeLayer,
  ctx: ScanContext,
): PropCandidate[] {
  const results: PropCandidate[] = [];

  // ── Layer verification: is a prop carrying translation keys sent here? ──
  for (const { propName, expression } of layer.propsSent) {
    const keys = extractKeys(expression, layer.sourceEntry.scriptVariableMap);

    for (const key of keys) {
      // Prop sent → run the analysis exactly as it runs today
      results.push(
        ...visitPropChain(ctx, {
          key,
          sourcePath: layer.sourceEntry.filePath,
          componentInitial: layer.componentName,
          componentName: layer.componentName,
          propName,
        }),
      );
    }
  }

  // ── Nothing (else) at this layer → move along to the next one ──
  for (const child of layer.children) {
    results.push(...verifyComponentTree(child, ctx));
  }

  return results;
}
