import type { ValueMap, ExtractedKey } from "../../types";

export function resolveCallExpression(args: {
  node: any;
  rawSource: string;
  valueMap: ValueMap;
  resolver: (args: {
    node: any;
    rawSource: string;
    valueMap: ValueMap;
  }) => ExtractedKey[];
}): ExtractedKey[] {
  const { node, rawSource, valueMap } = args;

  // ['a', 'b'].join('.') special case
  if (
    node.callee?.type === "MemberExpression" &&
    node.callee.property?.name === "join" &&
    node.callee.object?.type === "ArrayExpression"
  ) {
    const sep = node.arguments[0]?.value ?? "";
    const parts: string[] = [];
    let allLiteral = true;

    for (const el of node.callee.object.elements) {
      if (el?.type === "Literal" && typeof el.value === "string") {
        parts.push(el.value);
        continue;
      }
      allLiteral = false;
      break;
    }

    if (allLiteral && parts.length) {
      const key = parts.join(sep);
      return [{ type: "static", key, id: `__STATIC__${key}` }];
    }

    return [
      {
        type: "dynamic",
        expr: rawSource,
        candidates: [],
        id: `__EXPR__${rawSource}`,
      },
    ];
  } // ← join block ends here

  // getKey() — resolve function name against valueMap
  const fnName =
    node.callee?.type === "Identifier"
      ? node.callee.name
      : node.callee?.type === "MemberExpression"
        ? node.callee.property?.name
        : null;

  if (fnName) {
    const candidates = valueMap.get(fnName);
    if (candidates && candidates[0] !== "__PROP__" && candidates.length) {
      return candidates.map((c) => ({
        type: "static" as const,
        key: c,
        id: `__STATIC__${c}`,
      }));
    }
  }

  return [
    {
      type: "dynamic",
      expr: rawSource,
      candidates: [],
      id: `__EXPR__${rawSource}`,
    },
  ];
}
