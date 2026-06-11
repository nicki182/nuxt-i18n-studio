import type { ComponentPublicInstance } from "vue";

import type { ExtractedKey } from "../types/ast";
import type { ResolvedUsage } from "../types/i18nHTMLElement";

import { usePropKeyMap } from "./usePropKeyMap";

export const useAST = () => {
  const decodePayload = (raw: string): ExtractedKey[] => {
    try {
      if (!raw) return [];
      const clean = raw.trim().replace(/^['"]|['"]$/g, "");
      const decoded = atob(clean);
      return JSON.parse(decoded) as ExtractedKey[];
    } catch {
      return [];
    }
  };

  type ResolvedEntry = Omit<ResolvedUsage, "type"> & { usageType: string };

  type EntryResolver<T extends ExtractedKey> = (args: {
    entry: T;
    usageType: string;
    getPageKeys: () => string[];
    bindingInstance: ComponentPublicInstance | null;
  }) => ResolvedEntry[];

  const resolveDeclared: EntryResolver<Extract<ExtractedKey, { type: "static" }>> = ({ entry, usageType }) => {
    return [{ key: entry.key, usageType, source: "static" }];
  };

  const resolveStatic: EntryResolver<Extract<ExtractedKey, { type: "static" }>> = ({ entry, usageType }) => {
    return [{ key: entry.key, usageType, source: "static" }];
  };

  const resolveTraced: EntryResolver<Extract<ExtractedKey, { type: "traced" }>> = ({
    entry,
    usageType,
  }) => {
    // Prop chain entry — has a single candidate id for precise O(1) resolution
    const tracedEntry = entry as typeof entry & { propId?: string };

    if (tracedEntry.propId) {
      const { resolveById } = usePropKeyMap();
      const candidate = resolveById(tracedEntry.propId);

      if (candidate) {
        return [{ key: candidate.key, usageType, source: "static" as const }];
      }
      // propId present but not found in index — prop-map.json not generated yet
      return [];
    }

    // Non-prop traced entry — original allCandidates behaviour
    return (entry.allCandidates as { key: string }[]).map((c) => ({
      key: c.key,
      usageType,
      source: "traced" as const,
    }));
  };

  const resolvePrefix: EntryResolver<Extract<ExtractedKey, { type: "prefix" }>> = ({
    entry,
    usageType,
    getPageKeys,
  }) => {
    const runtimeMatches = getPageKeys().filter((k) => k.startsWith(entry.prefix));
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
    bindingInstance,
  }) => {
    const propName = (entry as unknown as { propName: string }).propName;
    if (!propName || !bindingInstance) return [];

    const propValue = bindingInstance.$props?.[propName];
    if (typeof propValue !== "string" || !propValue) return [];

    if (looksLikeI18nKey(propValue)) {
      return [{ key: propValue, usageType, source: "static" as const }];
    }

    return [{ key: propValue, usageType, source: "prop-translated" as const }];
  };

  const resolveDynamic: EntryResolver<Extract<ExtractedKey, { type: "dynamic" }>> = ({
    entry,
    usageType,
  }) => {
    if (entry.candidates?.length) {
      return entry.candidates.map((k) => ({
        key: k,
        usageType,
        source: "traced" as const,
      }));
    }
    return [];
  };

  const entryTypeResolver: Record<
    string,
    EntryResolver<Extract<ExtractedKey, { type: ExtractedKey }>>
  > = {
    static: resolveStatic as EntryResolver<Extract<ExtractedKey, { type: "static" }>>,
    traced: resolveTraced as EntryResolver<Extract<ExtractedKey, { type: "traced" }>>,
    prefix: resolvePrefix as EntryResolver<Extract<ExtractedKey, { type: "prefix" }>>,
    prop: resolveProp as EntryResolver<Extract<ExtractedKey, { type: "prop" }>>,
    dynamic: resolveDynamic as EntryResolver<Extract<ExtractedKey, { type: "dynamic" }>>,
    declared: resolveDeclared as EntryResolver<Extract<ExtractedKey, { type: "static" }>>,
  };

  const resolveUsages = (
    payload: ExtractedKey[],
    getPageKeys: () => string[],
    bindingInstance: ComponentPublicInstance | null = null,
  ): ResolvedUsage[] => {
    const seen = new Set<string>();

    return payload
      .flatMap((entry) => {
        const usageType =
          (entry as ExtractedKey & { usageType?: string }).usageType ?? "text:dynamic";
        const resolverKey = usageType === "declared" ? "declared" : entry.type;
        const resolver = entryTypeResolver[resolverKey];
        return resolver?.({ entry, usageType, getPageKeys, bindingInstance }) ?? [];
      })
      .filter(({ key, usageType }) => {
        if (!key || seen.has(`${key}::${usageType}`)) return false;
        seen.add(`${key}::${usageType}`);
        return true;
      })
      .map(({ usageType, ...rest }) => ({ ...rest, type: usageType })) as ResolvedUsage[];
  };

  return { decodePayload, resolveUsages };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function looksLikeI18nKey(value: string): boolean {
  return /^[\w-]+(\.[\w-]+){1,}$/.test(value);
}
