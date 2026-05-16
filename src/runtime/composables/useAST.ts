import type { ExtractedKey, ResolvedEntry, EntryResolver } from "../types/ast";
import type { ResolvedUsage } from "../types/i18nHTMLElement";

export function useAST() {
  const evaluateExpr = (expr: string, ctx: any): string | undefined => {
    try {
      return new Function("ctx", `with(ctx) { return ${expr}; }`)(ctx);
    } catch {
      return undefined;
    }
  };

  const decodePayload = (raw: string): ExtractedKey[] => {
    try {
      const clean = raw.trim().replace(/^['"]|['"]$/g, "");
      const decoded = atob(clean);
      return JSON.parse(decoded) as ExtractedKey[];
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
    // Fallback: show the prefix itself so editor knows something is there
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
    // We know the current value — only surface related keys
    results.push({ key: evaled, usageType, source: "runtime" });
    getPageKeys()
      .filter((k) => k === evaled || k.startsWith(evaled.split(".")[0]))
      .forEach((k) => results.push({ key: k, usageType, source: "runtime" }));
  }
  // Only fall back to ALL page keys if eval completely failed
  // and there are no candidates at all — avoids flooding the modal
  else if (entry.candidates?.length) {
    entry.candidates.forEach((k) =>
      results.push({ key: k, usageType, source: "traced" })
    );
  } else {
    // Truly unknown — nothing to narrow by, surface all as last resort
    getPageKeys().forEach((k) =>
      results.push({ key: k, usageType, source: "runtime" })
    );
  }

  return results;
};
  const entryTypeResolver: Record<string, EntryResolver<any>> = {
    static: resolveStatic,
    traced: resolveTraced,
    prefix: resolvePrefix,
    prop: resolveProp,
    dynamic: resolveDynamic,
  };

  // ── resolveUsages ─────────────────────────────────────────────────────────

  const resolveUsages = (
    payload: ExtractedKey[],
    bindingInstance: any,
    getPageKeys: () => string[],
  ): ResolvedUsage[] => {
    const seen = new Set<string>();
    return payload
      .flatMap((entry) => {
        const usageType = (entry as any).usageType ?? "text:dynamic";
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
};
