import type { ScanContext, TracePayload } from "@ast/types";

import { logger } from "@utils";
import { parse } from "@vue/compiler-dom";

import { buildPropRefs } from "./buildPropRefs";
import { tracePropUsage } from "./tracePropUsage";

/**
 * Visits a property chain in the context of a Vue component, tracing its usage and recording candidates.
 * @param ctx - The scan context containing the property key map and other relevant data.
 * @param payload - The trace payload containing information about the component and property.
 */
export function visitPropChain(ctx: ScanContext, payload: TracePayload): void {
  const visitHash = `${payload.componentName}::${payload.propName}::${payload.key}`;
  if (ctx.visited.has(visitHash)) return;
  ctx.visited.add(visitHash);

  const entry = ctx.byComponentName.get(payload.componentName);
  if (!entry?.templateContent) return;

  const propRefs = entry.scriptContent
    ? buildPropRefs(
        payload.propName,
        entry.scriptVariableMap,
        entry.scriptContent,
      )
    : new Set<string>([payload.propName]);

  try {
    tracePropUsage(parse(entry.templateContent), propRefs, payload, ctx);
  } catch {
    logger.warn(`Failed to parse template for component ${payload.componentName} at ${entry.filePath}.`);
  }
}
