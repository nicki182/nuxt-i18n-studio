import type { Plugin } from "vite";
// identifier/function name → all possible string values it can return/hold
// "__PROP__" sentinel means: value comes from a parent prop
export type ScriptVariableMap = Map<string, string[]>;

export enum KeyExtractionType {
  Static = "static",
  Traced = "traced",
  Prop = "prop",
  Dynamic = "dynamic",
  Prefix = "prefix",
}

export type ExtractedKey =
  | { type: KeyExtractionType.Static; key: string; id: `__STATIC__${string}` }
  | {
      type: KeyExtractionType.Traced;
      key: string;
      allCandidates: string[];
      id: `__TRACED__${string}`;
    }
  | { type: KeyExtractionType.Prop; propName: string; id: `__PROP__${string}` }
  | {
      type: KeyExtractionType.Dynamic;
      expr: string;
      candidates: string[];
      id: `__EXPR__${string}`;
    }
  | {
      type: KeyExtractionType.Prefix;
      prefix: string;
      id: `__PREFIX__${string}`;
    };

export interface HarvestedValue {
  value: string;
  name: string;
  isProp?: boolean;
}

export type ReturnHarvestedValue = HarvestedValue[];

export interface ASTPlugin extends Plugin {
  _valueMapCache: Map<string, ScriptVariableMap>;
}

export type PayloadEntry = ExtractedKey & { usageType: string };

export type HarvesterMap = {
  [K in Node["type"]]?: (
    node: Extract<Node, { type: K }>,
  ) => ReturnHarvestedValue | undefined;
};

export type ResolverMap = {
  [K in ResolvableNode["type"]]?: (
    args: ResolverArgs<Extract<ResolvableNode, { type: K }>>,
  ) => ExtractedKey[];
};
