import type { ElementNode } from "@vue/compiler-dom";
import type {
  Literal,
  Identifier,
  CallExpression,
  ConditionalExpression,
  LogicalExpression,
  TemplateLiteral,
  Node,
  FunctionDeclaration,
  VariableDeclarator,
  AssignmentExpression,
  Expression
} from "estree";
import type { Plugin } from "vite";

import type { KeyExtractionType } from "./constants";

export interface PropMapEntry {
  element: string; // "h1", "p", "span", "unknown", etc.
  candidates: PropCandidate[];
}
export interface HarvestedValue {
  value: string;
  name: string;
  isProp?: boolean;
}

export type PropKeyMap = Map<
  string,
  Map<string, { element: string; candidates: { key: string; page: string; component: string }[] }>
>;

export type ReturnHarvestedValue = HarvestedValue[];

export type HarvesterMap = {
  [K in Node["type"]]?: (
    node: Extract<Node, { type: K }>,
  ) => ReturnHarvestedValue | undefined;
};

// ── Template extraction ───────────────────────────────────────────────────────

// Derive literal types from the const object values
type KET = typeof KeyExtractionType;

export type ExtractedKey =
  | { type: KET["Static"]; key: string; id: `__STATIC__${string}` }
  | {
      type: KET["Traced"];
      key: string;
      allCandidates: string[];
      id: `__TRACED__${string}`;
    }
  | { type: KET["Prop"]; propName: string; id: `__PROP__${string}` }
  | {
      type: KET["Dynamic"];
      expr: string;
      candidates: string[];
      id: `__EXPR__${string}`;
    }
  | { type: KET["Prefix"]; prefix: string; id: `__PREFIX__${string}` };

export type ScriptResolver =
  | { type: KET["Static"]; key: string; id: `__STATIC__${string}` }
  | { type: KET["Prefix"]; prefix: string; id: `__PREFIX__${string}` }
  | { type: KET["Dynamic"]; expr: string; id: `__EXPR__${string}` }
  | {
      type: KET["Traced"];
      key: string;
      allCandidates: string[];
      id: `__TRACED__${string}`;
    }
  | { type: KET["Direct"]; key: string; id: `__STATIC__${string}` };

export type PayloadEntry = ExtractedKey & { usageType: string };

export type ScriptVariableMap = Map<string, string[]>;
export type TemplateVariableMap = Map<string, ScriptResolver[]>;

export type ScriptResolvableNode = VariableDeclarator | FunctionDeclaration | AssignmentExpression | Expression;

export type ResolvableNode =
  | Literal
  | Identifier
  | CallExpression
  | ConditionalExpression
  | LogicalExpression
  | TemplateLiteral
  | Expression;

export type ResolverArgs<T extends ResolvableNode> = {
  node: T;
  rawSource: string;
  valueMap: ScriptVariableMap;
};

export type ScriptResolverArgs<T extends ScriptResolvableNode> = {
  node: T;
  source: string;
};

export type ResolverMap = {
  [K in ResolvableNode["type"]]?: (
    args: ResolverArgs<Extract<ResolvableNode, { type: K }>>,
  ) => ExtractedKey[];
};

export type ResolverMapScript = {
  [K in ScriptResolvableNode["type"]]?: (
    args: ScriptResolverArgs<Extract<ScriptResolvableNode, { type: K }>>,
  ) => ScriptResolver[];
};

export type ComponentInitialIndex = Map<
  string,
  Map<string, { propId: string; element: string; componentEnd: string }[]>
>;
export interface ASTPlugin extends Plugin {
  _valueMapCache: Map<string, ScriptVariableMap>;
  _templateMapCache: Map<string, TemplateVariableMap>;
  _propKeyMap: PropKeyMap;
  _componentInitialIndex: ComponentInitialIndex; // build-time only
}

export type WrappableElementNode = ElementNode & { __i18nWrapped?: boolean };

export interface ElementCacheEntry {
  componentName: string;
  filePath: string;
  templateContent: string | null;
  scriptContent: string | null;
  scriptVariableMap: ScriptVariableMap;
  templateVariableMap: TemplateVariableMap;
}

export interface PropCandidate {
  key: string;
  path: string;           // file where $t() was called
  componentInitial: string; // first component the prop was passed to
  componentEnd: string;     // component that owns the native element
  propName: string;
  element: string;
}

interface PropEndEntry {
  element: string;
  candidates: PropCandidate[];
}

// byComponentInitial lookup entry — lightweight, no key duplication
interface InitialIndexEntry {
  propId: string;
  element: string;
  componentEnd: string;
}

interface PropMapJson {
  byComponentEnd: Record<string, Record<string, PropEndEntry>>;
  byComponentInitial: Record<string, Record<string, InitialIndexEntry[]>>;
}

export interface RawInputFile {
  relativePath: string;
  source: string;
}

export interface AnalyzeResult {
  jsonReport: PropMapJson;
  metrics: {
    componentCount: number;
    totalProps: number;
    totalCandidates: number;
  };
}

export interface ScanContext {
  propKeyMap: PropKeyMap;
  byFilePath: Map<string, ElementCacheEntry>;
  byComponentName: Map<string, ElementCacheEntry>;
  visited: Set<string>;
}

export interface TracePayload {
  key: string;
  sourcePath: string;
  componentInitial: string;
  componentName: string;
  propName: string;
}