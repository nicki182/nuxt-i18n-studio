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
} from "estree";
import type { Plugin } from "vite";

import type { KeyExtractionType } from "./constants";

export interface HarvestedValue {
  value: string;
  name: string;
  isProp?: boolean;
}

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

export type ScriptResolvableNode = VariableDeclarator | FunctionDeclaration;

export type ResolvableNode =
  | Literal
  | Identifier
  | CallExpression
  | ConditionalExpression
  | LogicalExpression
  | TemplateLiteral;

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
export interface ASTPlugin extends Plugin {
  _valueMapCache: Map<string, ScriptVariableMap>;
  _templateMapCache: Map<string, TemplateVariableMap>;
}

export type WrappableElementNode = ElementNode & { __i18nWrapped?: boolean };
