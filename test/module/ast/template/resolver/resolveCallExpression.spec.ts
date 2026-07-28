import { KeyExtractionType } from "@ast/constants";
import { resolveCallExpression } from "@ast/template/resolver/resolveCallExpression";
import { describe, expect, it } from "vitest";

describe("resolveCallExpression", () => {
  it("resolves a literal array join expression into a static key", () => {
    const node = {
      type: "CallExpression",
      callee: {
        type: "MemberExpression",
        object: {
          type: "ArrayExpression",
          elements: [
            { type: "Literal", value: "home" },
            { type: "Literal", value: "title" },
          ],
        },
        property: {
          type: "Identifier",
          name: "join",
        },
        computed: false,
      },
      arguments: [{ type: "Literal", value: "." }],
    } as never;

    const result = resolveCallExpression({
      node,
      rawSource: "['home', 'title'].join('.')",
      valueMap: new Map(),
    });

    expect(result).toEqual([
      {
        type: KeyExtractionType.Static,
        key: "home.title",
        id: "__STATIC__home.title",
      },
    ]);
  });

  it("returns a dynamic fallback when the join expression contains non-literal values", () => {
    const node = {
      type: "CallExpression",
      callee: {
        type: "MemberExpression",
        object: {
          type: "ArrayExpression",
          elements: [
            { type: "Literal", value: "home" },
            { type: "Identifier", name: "section" },
          ],
        },
        property: {
          type: "Identifier",
          name: "join",
        },
        computed: false,
      },
      arguments: [{ type: "Literal", value: "." }],
    } as never;

    const result = resolveCallExpression({
      node,
      rawSource: "['home', section].join('.')",
      valueMap: new Map(),
    });

    expect(result).toEqual([
      {
        type: KeyExtractionType.Dynamic,
        expr: "['home', section].join('.')",
        candidates: [],
        id: "__EXPR__['home', section].join('.')",
      },
    ]);
  });

  it("resolves a known function name against the script variable map", () => {
    const node = {
      type: "CallExpression",
      callee: {
        type: "Identifier",
        name: "getKey",
      },
      arguments: [],
    } as never;

    const result = resolveCallExpression({
      node,
      rawSource: "getKey()",
      valueMap: new Map([["getKey", ["home.title", "home.subtitle"]]]),
    });

    expect(result).toEqual([
      {
        type: KeyExtractionType.Static,
        key: "home.title",
        id: "__STATIC__home.title",
      },
      {
        type: KeyExtractionType.Static,
        key: "home.subtitle",
        id: "__STATIC__home.subtitle",
      },
    ]);
  });

  it("falls back to a dynamic result when the function name is unresolved or marked as a prop", () => {
    const node = {
      type: "CallExpression",
      callee: {
        type: "Identifier",
        name: "missingKey",
      },
      arguments: [],
    } as never;

    const unresolvedResult = resolveCallExpression({
      node,
      rawSource: "missingKey()",
      valueMap: new Map(),
    });

    expect(unresolvedResult).toEqual([
      {
        type: KeyExtractionType.Dynamic,
        expr: "missingKey()",
        candidates: [],
        id: "__EXPR__missingKey()",
      },
    ]);

    const propResult = resolveCallExpression({
      node: {
        type: "CallExpression",
        callee: {
          type: "Identifier",
          name: "propKey",
        },
        arguments: [],
      } as never,
      rawSource: "propKey()",
      valueMap: new Map([["propKey", ["__PROP__"]]]),
    });

    expect(propResult).toEqual([
      {
        type: KeyExtractionType.Dynamic,
        expr: "propKey()",
        candidates: [],
        id: "__EXPR__propKey()",
      },
    ]);
  });
});
