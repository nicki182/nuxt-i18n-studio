import type { ExtractedKey } from "../types/ast";
import type { ResolvedUsage } from "../types/i18nHTMLElement";

// ── useAST ────────────────────────────────────────────────────────────────────
// Composable that handles decoding and resolving the i18n-studio directive
// payload at runtime. All resolution is CSP-safe — no eval, no new Function.
//
// Resolution priority per entry type:
//   declared → static analysis → traced → prefix match → runtime $t harvest
//
// For prop and dynamic entries where static analysis couldn't resolve the key,
// developers should add data-i18n-keys="key.one,key.two" to the element.
// Those entries arrive as "declared" type and take priority.

export const useAST = () => {
  // ── Payload decoder ─────────────────────────────────────────────────────────

  const decodePayload = (raw: string): ExtractedKey[] => {
    try {
      // Vue's runtime strips surrounding quotes from binding values but
      // we defensively clean them in case the raw string arrives quoted
      const clean = raw.trim().replace(/^['"]|['"]$/g, "");
      const decoded = atob(clean);
      return JSON.parse(decoded) as ExtractedKey[];
    } catch {
      return [];
    }
  };

  // ── Entry Resolvers ───────────────────────────────────────────────────────

  type ResolvedEntry = Omit<ResolvedUsage, "type"> & { usageType: string };

  type EntryResolver<T extends ExtractedKey> = (args: {
    entry: T;
    usageType: string;
    getPageKeys: () => string[];
  }) => ResolvedEntry[];

  // Declared via data-i18n-keys attribute — developer knows best
  // Highest priority, always shown first
  const resolveDeclared: EntryResolver<
    Extract<ExtractedKey, { type: "static" }>
  > = ({ entry, usageType }) => {
    return [{ key: entry.key, usageType, source: "static" }];
  };

  // Static literal — $t('home.title'), getKey(), ternary branches
  const resolveStatic: EntryResolver<
    Extract<ExtractedKey, { type: "static" }>
  > = ({ entry, usageType }) => {
    return [{ key: entry.key, usageType, source: "static" }];
  };

  // Traced from script — ref with multiple .value assignments
  const resolveTraced: EntryResolver<
    Extract<ExtractedKey, { type: "traced" }>
  > = ({ entry, usageType }) => {
    return entry.allCandidates.map((k) => ({
      key: k,
      usageType,
      source: "traced" as const,
    }));
  };

  // Prefix from template literal — `errors.${code}`
  // Cross-references the runtime $t harvest to find matching keys
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

  // Prop — value comes from parent, couldn't be statically resolved.
  // No eval — falls back to runtime $t harvest.
  // Encourage developer to add data-i18n-keys to the element instead.
  const resolveProp: EntryResolver<Extract<ExtractedKey, { type: "prop" }>> = ({
    usageType,
    getPageKeys,
  }) => {
    return getPageKeys().map((k) => ({
      key: k,
      usageType,
      source: "runtime" as const,
    }));
  };

  // Dynamic — unknown expression, no static trace found.
  // No eval — falls back to runtime $t harvest.
  // Encourage developer to add data-i18n-keys to the element instead.
  const resolveDynamic: EntryResolver<
    Extract<ExtractedKey, { type: "dynamic" }>
  > = ({ entry, usageType, getPageKeys }) => {
    const runtimeKeys = getPageKeys();

    // If we have pre-resolved candidates from the extractor use those
    if (entry.candidates?.length) {
      return entry.candidates.map((k) => ({
        key: k,
        usageType,
        source: "traced" as const,
      }));
    }

    // Fall back to full runtime harvest
    return runtimeKeys.map((k) => ({
      key: k,
      usageType,
      source: "runtime" as const,
    }));
  };

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
    declared: resolveDeclared as EntryResolver<
      Extract<ExtractedKey, { type: "static" }>
    >,
  };

  // ── resolveUsages ───────────────────────────────────────────────────────────

  const resolveUsages = (
    payload: ExtractedKey[],
    getPageKeys: () => string[],
  ): ResolvedUsage[] => {
    const seen = new Set<string>();

    return payload
      .flatMap((entry) => {
        const usageType =
          (entry as ExtractedKey & { usageType?: string }).usageType ??
          "text:dynamic";

        // "declared" entries use the static resolver — they arrive as
        // type: "static" with usageType: "declared" from the node transform
        const resolverKey = usageType === "declared" ? "declared" : entry.type;
        const resolver = entryTypeResolver[resolverKey];

        return resolver?.({ entry, usageType, getPageKeys }) ?? [];
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

  return { decodePayload, resolveUsages };
};
