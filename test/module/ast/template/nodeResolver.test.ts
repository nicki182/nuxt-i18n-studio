import type {
  Node,
  Literal,
  Identifier,
  TemplateLiteral,
  ConditionalExpression,
  LogicalExpression,
  CallExpression,
} from "estree";

import { describe, it, expect } from "vitest";

import type { ScriptVariableMap } from "../../../../src/ast/types";

import { nodeResolver } from "../../../../src/ast/template/resolver/nodeResolver";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMap(entries: Record<string, string[]>): ScriptVariableMap {
  return new Map(Object.entries(entries));
}

// ── nodeResolver ──────────────────────────────────────────────────────────────

describe("nodeResolver", () => {
  // ── Null / unknown nodes ──────────────────────────────────────────────────────

  it("returns empty array for null node", () => {
    expect(
      nodeResolver({ node: null, rawSource: "", valueMap: new Map() }),
    ).toEqual([]);
  });

  it("returns empty array for undefined node", () => {
    expect(
      nodeResolver({ node: undefined, rawSource: "", valueMap: new Map() }),
    ).toEqual([]);
  });

  it("returns empty array for unknown node type", () => {
    const node: Node = { type: "UnknownType" } as Node; // still need cast because "UnknownType" not in union
    // But this is safe: we're intentionally passing an invalid node to test fallback.
    // Alternatively, use `as ` – not `any`.
    expect(nodeResolver({ node, rawSource: "", valueMap: new Map() })).toEqual(
      [],
    );
  });

  // ── Literal ───────────────────────────────────────────────────────────────────

  it("resolves a string literal", () => {
    const node: Literal = { type: "Literal", value: "home.title" };
    const result = nodeResolver({
      node,
      rawSource: "'home.title'",
      valueMap: new Map(),
    });
    expect(result).toEqual([
      { type: "static", key: "home.title", id: "__STATIC__home.title" },
    ]);
  });

  it("ignores non-string literals", () => {
    const node: Literal = { type: "Literal", value: 42 };
    const result = nodeResolver({ node, rawSource: "42", valueMap: new Map() });
    expect(result).toEqual([]);
  });

  it("ignores empty string literals", () => {
    const node: Literal = { type: "Literal", value: "" };
    const result = nodeResolver({ node, rawSource: "''", valueMap: new Map() });
    expect(result).toEqual([]);
  });

  // ── Identifier ────────────────────────────────────────────────────────────────

  it("resolves identifier to dynamic when not in map", () => {
    const node: Identifier = { type: "Identifier", name: "unknownKey" };
    const result = nodeResolver({
      node,
      rawSource: "unknownKey",
      valueMap: new Map(),
    });
    expect(result).toEqual([
      {
        type: "dynamic",
        expr: "unknownKey",
        candidates: [],
        id: "__EXPR__unknownKey",
      },
    ]);
  });

  it("resolves identifier to prop when marked __PROP__", () => {
    const node: Identifier = { type: "Identifier", name: "titleKey" };
    const map = makeMap({ titleKey: ["__PROP__"] });
    const result = nodeResolver({ node, rawSource: "titleKey", valueMap: map });
    expect(result).toEqual([
      { type: "prop", propName: "titleKey", id: "__PROP__titleKey" },
    ]);
  });

  it("resolves identifier to traced + static when in map", () => {
    const node: Identifier = { type: "Identifier", name: "dynamicKey" };
    const map = makeMap({ dynamicKey: ["home.first", "home.second"] });
    const result = nodeResolver({
      node,
      rawSource: "dynamicKey",
      valueMap: map,
    });

    expect(result).toContainEqual({
      type: "traced",
      key: "home.first",
      allCandidates: ["home.first", "home.second"],
      id: "__TRACED__home.first",
    });
    expect(result).toContainEqual({
      type: "static",
      key: "home.first",
      id: "__STATIC__home.first",
    });
    expect(result).toContainEqual({
      type: "static",
      key: "home.second",
      id: "__STATIC__home.second",
    });
  });

  // ── TemplateLiteral ───────────────────────────────────────────────────────────

  it("resolves static template literal", () => {
    const node: TemplateLiteral = {
      type: "TemplateLiteral",
      expressions: [],
      quasis: [
        {
          value: { cooked: "home.title", raw: "`home.title`" },
          tail: true,
          type: "TemplateElement",
        },
      ],
    };
    const result = nodeResolver({
      node,
      rawSource: "`home.title`",
      valueMap: new Map(),
    });
    expect(result).toEqual([
      { type: "static", key: "home.title", id: "__STATIC__home.title" },
    ]);
  });

  it("resolves dynamic template literal to prefix", () => {
    const node: TemplateLiteral = {
      type: "TemplateLiteral",
      expressions: [{}], // has expressions — dynamic
      quasis: [
        {
          value: { cooked: "errors.", raw: "`errors.`" },
          tail: false,
          type: "TemplateElement",
        },
        {
          value: { cooked: "", raw: "`" },
          tail: true,
          type: "TemplateElement",
        },
      ],
    };
    const result = nodeResolver({
      node,
      rawSource: "`errors.${code}`",
      valueMap: new Map(),
    });
    expect(result).toEqual([
      { type: "prefix", prefix: "errors.", id: "__PREFIX__errors." },
    ]);
  });

  // ── ConditionalExpression ─────────────────────────────────────────────────────

  it("resolves both branches of a ternary", () => {
    const node: ConditionalExpression = {
      type: "ConditionalExpression",
      test: {},
      consequent: { type: "Literal", value: "home.admin" },
      alternate: { type: "Literal", value: "home.user" },
    };
    const result = nodeResolver({
      node,
      rawSource: "isAdmin ? 'home.admin' : 'home.user'",
      valueMap: new Map(),
    });
    expect(result).toContainEqual({
      type: "static",
      key: "home.admin",
      id: "__STATIC__home.admin",
    });
    expect(result).toContainEqual({
      type: "static",
      key: "home.user",
      id: "__STATIC__home.user",
    });
  });

  it("resolves nested ternary", () => {
    const node: ConditionalExpression = {
      type: "ConditionalExpression",
      test: {},
      consequent: { type: "Literal", value: "home.admin.premium" },
      alternate: {
        type: "ConditionalExpression",
        test: {},
        consequent: { type: "Literal", value: "home.admin.basic" },
        alternate: { type: "Literal", value: "home.user" },
      },
    };
    const result = nodeResolver({
      node,
      rawSource: "...",
      valueMap: new Map(),
    });
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.key)).toEqual([
      "home.admin.premium",
      "home.admin.basic",
      "home.user",
    ]);
  });

  // ── LogicalExpression ─────────────────────────────────────────────────────────

  it("resolves both sides of logical OR", () => {
    const node: LogicalExpression = {
      type: "LogicalExpression",
      operator: "||",
      left: { type: "Identifier", name: "unknownKey" },
      right: { type: "Literal", value: "home.fallback" },
    };
    const result = nodeResolver({
      node,
      rawSource: "unknownKey || 'home.fallback'",
      valueMap: new Map(),
    });
    expect(result).toContainEqual({
      type: "static",
      key: "home.fallback",
      id: "__STATIC__home.fallback",
    });
  });

  // ── CallExpression ────────────────────────────────────────────────────────────

  it("resolves getKey() when function is in map", () => {
    const node: CallExpression = {
      type: "CallExpression",
      callee: { type: "Identifier", name: "getKey" },
      arguments: [],
    };
    const map = makeMap({ getKey: ["home.dynamic.first"] });
    const result = nodeResolver({ node, rawSource: "getKey()", valueMap: map });
    expect(result).toEqual([
      {
        type: "static",
        key: "home.dynamic.first",
        id: "__STATIC__home.dynamic.first",
      },
    ]);
  });

  it("resolves getKey() to dynamic when not in map", () => {
    const node: CallExpression = {
      type: "CallExpression",
      callee: { type: "Identifier", name: "unknownFn" },
      arguments: [],
    };
    const result = nodeResolver({
      node,
      rawSource: "unknownFn()",
      valueMap: new Map(),
    });
    expect(result).toEqual([
      {
        type: "dynamic",
        expr: "unknownFn()",
        candidates: [],
        id: "__EXPR__unknownFn()",
      },
    ]);
  });

  it("resolves array join", () => {
    const node: CallExpression = {
      type: "CallExpression",
      callee: {
        type: "MemberExpression",
        computed: false,
        object: {
          type: "ArrayExpression",
          elements: [
            { type: "Literal", value: "home" },
            { type: "Literal", value: "title" },
          ],
        },
        property: { type: "Identifier", name: "join" },
      },
      arguments: [{ type: "Literal", value: "." }],
    };
    const result = nodeResolver({
      node,
      rawSource: "['home','title'].join('.')",
      valueMap: new Map(),
    });
    expect(result).toEqual([
      { type: "static", key: "home.title", id: "__STATIC__home.title" },
    ]);
  });
});
