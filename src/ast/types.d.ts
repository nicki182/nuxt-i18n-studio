import type { Plugin } from "vite";
// identifier/function name → all possible string values it can return/hold
// "__PROP__" sentinel means: value comes from a parent prop
export type ScriptVariableMap = Map<string, string[]>;

export type ExtractedKey =
  | { type: "static"; key: string; id: `__STATIC__${string}` }
  | {
      type: "traced";
      key: string;
      allCandidates: string[];
      id: `__TRACED__${string}`;
    }
  | { type: "prop"; propName: string; id: `__PROP__${string}` }
  | {
      type: "dynamic";
      expr: string;
      candidates: string[];
      id: `__EXPR__${string}`;
    }
  | { type: "prefix"; prefix: string; id: `__PREFIX__${string}` };

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
