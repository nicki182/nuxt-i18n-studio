import type { ComponentPublicInstance } from "vue";

import type { ExtractedKey, ResolvedEntry, EntryResolver } from "../types/ast";
import type { ResolvedUsage } from "../types/i18nHTMLElement";

// Payload injected by the compiler includes the usageType
type PayloadEntry = ExtractedKey & { usageType?: string };

/**
 *
 */
export function useAST() {
  const evaluateExpr = (
    expr: string,
    ctx: ComponentPublicInstance | null,
  ): string | undefined => {
    if (!ctx) return undefined;
    try {
      return new Function("ctx", `with(ctx) { return ${expr}; }`)(ctx);
    } catch {
      return undefined;
    }
  };

  const decodePayload = (raw: string): PayloadEntry[] => {
    try {
      const clean = raw.trim().replace(/^['"]|['"]$/g, "");
      const decoded = atob(clean);
      return JSON.parse(decoded) as PayloadEntry[];
    } catch {
      return [];
    }
  };

  // ── Entry Resolvers ───────────────────────────────────────────────────────

  const resolveStatic: EntryResolver<
    Extract<ExtractedKey, { type: "static" }>
  > = ({ entry, usageType }) => {
    return [{ key: entry.key, usageType, source: "static" }];
  };

  const resolveTraced: EntryResolver<
    Extract<ExtractedKey, { type: "traced" }>
  > = ({ entry, usageType }) => {
    return entry.allCandidates.map((k) => ({
      key: k,
      usageType,
      source: "traced" as const,
    }));
  };

  const resolvePrefix: EntryResolver<
    Extract<ExtractedKey, { type: "prefix" }>
  > = ({ entry, usageType, getPageKeys }) => {
    const runtimeMatches = getPageKeys().filter((k) =>
      k.startsWith(entry.prefix),
    );
    if (runtimeMatches.length) {
      return runtimeMatches.map((k) => ({
        key: k,
        usageType,
        source: "runtime" as const,
      }));
    }
    return [{ key: `${entry.prefix}*`, usageType, source: "runtime" as const }];
  };

  const resolveProp: EntryResolver<Extract<ExtractedKey, { type: "prop" }>> = ({
    entry,
    usageType,
    getPageKeys,
    bindingInstance,
  }) => {
    const results: ResolvedEntry[] = [];
    const evaled = evaluateExpr(entry.propName, bindingInstance);
    if (evaled) results.push({ key: evaled, usageType, source: "prop" });
    getPageKeys().forEach((k) =>
      results.push({ key: k, usageType, source: "runtime" }),
    );
    return results;
  };

  const resolveDynamic: EntryResolver<
    Extract<ExtractedKey, { type: "dynamic" }>
  > = ({ entry, usageType, getPageKeys, bindingInstance }) => {
    const results: ResolvedEntry[] = [];
    const evaled = evaluateExpr(entry.expr, bindingInstance);

    if (evaled) {
      results.push({ key: evaled, usageType, source: "runtime" });
      getPageKeys()
        .filter((k) => k === evaled || k.startsWith(evaled.split(".")[0] ?? ""))
        .forEach((k) => results.push({ key: k, usageType, source: "runtime" }));
    } else if (entry.candidates?.length) {
      entry.candidates.forEach((k) =>
        results.push({ key: k, usageType, source: "traced" }),
      );
    } else {
      getPageKeys().forEach((k) =>
        results.push({ key: k, usageType, source: "runtime" }),
      );
    }

    return results;
  };

  // We use `unknown` here because the types of `entry` branch based on `entry.type` inside the specific resolver
  const entryTypeResolver: Record<
    string,
    EntryResolver<Extract<ExtractedKey, { type: ExtractedKey }>>
  > = {
    static: resolveStatic as EntryResolver<
      Extract<ExtractedKey, { type: "static" }>
    >,
    traced: resolveTraced as EntryResolver<
      Extract<ExtractedKey, { type: "traced" }>
    >,
    prefix: resolvePrefix as EntryResolver<
      Extract<ExtractedKey, { type: "prefix" }>
    >,
    prop: resolveProp as EntryResolver<Extract<ExtractedKey, { type: "prop" }>>,
    dynamic: resolveDynamic as EntryResolver<
      Extract<ExtractedKey, { type: "dynamic" }>
    >,
  };

  // ── resolveUsages ─────────────────────────────────────────────────────────

  const resolveUsages = (
    payload: PayloadEntry[],
    bindingInstance: ComponentPublicInstance | null,
    getPageKeys: () => string[],
  ): ResolvedUsage[] => {
    const seen = new Set<string>();
    return payload
      .flatMap((entry) => {
        const usageType = entry.usageType ?? "text:dynamic";
        const resolver = entryTypeResolver[entry.type];
        return (
          resolver?.({ entry, usageType, getPageKeys, bindingInstance }) ?? []
        );
      })
      .filter(({ key, usageType }) => {
        if (!key || seen.has(`${key}::${usageType}`)) return false;
        seen.add(`${key}::${usageType}`);
        return true;
      })
      .map(({ usageType, ...rest }) => ({
        ...rest,
        type: usageType,
      })) as ResolvedUsage[];
  };

  return { evaluateExpr, decodePayload, resolveUsages };
}
