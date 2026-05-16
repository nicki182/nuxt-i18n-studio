import type {
  CallExpression,
  MemberExpression,
  ArrayExpression,
  Identifier,
  Literal,
} from "estree";

import type { ScriptVariableMap, ExtractedKey } from "../../types";

import { KeyExtractionType } from "../../types";

/**
 * Resolves a CallExpression node from a $t() argument to all possible
 * ExtractedKey values. Handles two cases:
 * - ['a', 'b'].join('.') — reconstructs the joined string statically
 * - getKey()             — resolves the function name against the ScriptVariableMap
 * @param args
 * @param args.node
 * @param args.rawSource
 * @param args.valueMap
 */
export function resolveCallExpression(args: {
  node: CallExpression;
  rawSource: string;
  valueMap: ScriptVariableMap;
}): ExtractedKey[] {
  const { node, rawSource, valueMap } = args;

  // ── ['a', 'b'].join('.') special case ──────────────────────────────────────
  if (
    node.callee.type === "MemberExpression" &&
    (node.callee as MemberExpression).property.type === "Identifier" &&
    ((node.callee as MemberExpression).property as Identifier).name ===
      "join" &&
    !(node.callee as MemberExpression).computed &&
    (node.callee as MemberExpression).object.type === "ArrayExpression"
  ) {
    const member = node.callee as MemberExpression;
    const arrayNode = member.object as ArrayExpression;

    const sepArg = node.arguments[0];
    const sep =
      sepArg?.type === "Literal" &&
      typeof (sepArg as Literal).value === "string"
        ? String((sepArg as Literal).value)
        : "";

    const parts: string[] = [];
    let allLiteral = true;

    for (const el of arrayNode.elements) {
      if (el?.type === "Literal" && typeof (el as Literal).value === "string") {
        parts.push(String((el as Literal).value));
        continue;
      }
      allLiteral = false;
      break;
    }

    if (allLiteral && parts.length) {
      const key = parts.join(sep);
      return [{ type: KeyExtractionType.Static, key, id: `__STATIC__${key}` }];
    }

    return [
      {
        type: KeyExtractionType.Dynamic,
        expr: rawSource,
        candidates: [],
        id: `__EXPR__${rawSource}`,
      },
    ];
  }

  // ── getKey() — resolve function name against ScriptVariableMap ─────────────
  const fnName =
    node.callee.type === "Identifier"
      ? (node.callee as Identifier).name
      : node.callee.type === "MemberExpression" &&
          !(node.callee as MemberExpression).computed &&
          (node.callee as MemberExpression).property.type === "Identifier"
        ? ((node.callee as MemberExpression).property as Identifier).name
        : null;

  if (fnName) {
    const candidates = valueMap.get(fnName);
    if (candidates && candidates[0] !== "__PROP__" && candidates.length) {
      return candidates.map((c) => ({
        type: KeyExtractionType.Static,
        key: c,
        id: `__STATIC__${c}` as `__STATIC__${string}`,
      }));
    }
  }

  return [
    {
      type: KeyExtractionType.Dynamic,
      expr: rawSource,
      candidates: [],
      id: `__EXPR__${rawSource}`,
    },
  ];
}
