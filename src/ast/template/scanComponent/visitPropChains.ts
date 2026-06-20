import { parse } from "@vue/compiler-dom";

import type { ScanContext, TracePayload } from "../../types";

import { buildPropRefs } from "./buildPropRefs";
import { tracePropUsage } from "./tracePropUsage";

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
  } catch {}
}
