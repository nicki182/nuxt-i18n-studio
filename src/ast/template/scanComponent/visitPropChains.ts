import type { PropCandidate, ScanContext, TracePayload } from "@ast/types";

import { logger } from "@utils";
import { parse } from "@vue/compiler-dom";

import { buildPropRefs } from "./buildPropRefs";
import { tracePropUsage } from "./tracePropUsage";

/**
 * Visits a property chain in the context of a Vue component and returns all matched candidates.
 * Manages cycle detection via ctx.visited — does not write to ctx.propKeyMap.
 * @param ctx - The scan context (used for lookups and visited tracking only).
 * @param payload - The trace payload containing information about the component and property.
 * @returns {PropCandidate[]} - All candidates found by tracing this prop chain.
 */
export function visitPropChain(
  ctx: ScanContext,
  payload: TracePayload,
): PropCandidate[] {
  const visitHash = `${payload.componentName}::${payload.propName}::${payload.key}`;
  if (ctx.visited.has(visitHash)) return [];
  ctx.visited.add(visitHash);

  const entry = ctx.byComponentName.get(payload.componentName);
  if (!entry?.templateContent) return [];

  const propRefs = entry.scriptContent
    ? buildPropRefs(
        payload.propName,
        entry.scriptVariableMap,
        entry.scriptContent,
      )
    : new Set<string>([payload.propName]);

  try {
    return tracePropUsage(
      parse(entry.templateContent),
      propRefs,
      payload,
      (componentName, propName) =>
        visitPropChain(ctx, { ...payload, componentName, propName }),
    );
  } catch {
    logger.warn(
      `Failed to parse template for component ${payload.componentName} at ${entry.filePath}.`,
    );
    return [];
  }
}
