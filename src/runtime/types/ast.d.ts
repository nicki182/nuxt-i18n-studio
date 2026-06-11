import type { ComponentPublicInstance } from "vue";

// Add to your existing types/ast.ts

export interface PropCandidate {
  id: string;
  key: string;
  path: string;
  componentInitial: string;
  componentEnd: string;
  propName: string;
  element: string;
}
interface ASTElement {
  type: number;
  tagType?: number;
  loc?: { source?: string };
  props?: unknown[];
  children?: unknown[];
}

interface ASTInterpolation {
  type: number;
  content?: { content?: string };
}

interface ASTDirective {
  type: number;
  name: string;
  exp?: { content?: string };
  arg?: { content?: string };
  modifiers: string[];
  loc: unknown;
}

export enum KeyExtractionType {
  Static = "static",
  Traced = "traced",
  Prop = "prop",
  Dynamic = "dynamic",
  Prefix = "prefix",
}

export type ExtractedKey =
  | { type: KeyExtractionType.Static; key: string }
  | { type: KeyExtractionType.Traced; key: string; allCandidates: string[] }
  | { type: KeyExtractionType.Prop; propName: string }
  | { type: KeyExtractionType.Dynamic; expr: string; candidates: string[] }
  | { type: KeyExtractionType.Prefix; prefix: string };

type ResolvedEntry = Omit<ResolvedUsage, "type"> & { usageType: string };

type EntryResolver<T extends ExtractedKey> = (args: {
  entry: T;
  usageType: string;
  getPageKeys: () => string[];
  bindingInstance: ComponentPublicInstance | null;
}) => ResolvedEntry[];

// ── Types ─────────────────────────────────────────────────────────────────────

// What the directive passes to openModal — one entry per unique key
export interface TranslationEntry {
  key: string;
  usages: string[]; // ["text:dynamic", "attr:placeholder"]
  source: KeyExtractionType;
}
