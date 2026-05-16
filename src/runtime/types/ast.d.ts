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

export type ExtractedKey =
  | { type: "static"; key: string }
  | { type: "traced"; key: string; allCandidates: string[] }
  | { type: "prop"; propName: string }
  | { type: "dynamic"; expr: string; candidates: string[] }
  | { type: "prefix"; prefix: string };

  type ResolvedEntry = Omit<ResolvedUsage, "type"> & { usageType: string };

type EntryResolver<T extends ExtractedKey> = (args: {
  entry: T;
  usageType: string;
  getPageKeys: () => string[];
  bindingInstance: any;
}) => ResolvedEntry[];
