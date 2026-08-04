import type { ArrowFunctionExpression } from "estree";

import { describe, it, expect } from "vitest";

import { harvestFunctionReturns } from "../../../../../src/ast/script/harvest/harvestFromFunctionReturns";
import {
  mockArrowBlock,
  mockArrowImplicit,
  mockLiteral,
  mockIdentifier,
  mockReturnStatement,
  mockFunctionExpression,
  mockFunctionDeclaration,
  mockBlockStatement,
} from "../../mocks";

// ── harvestFunctionReturns ────────────────────────────────────────────────────

describe("harvestFunctionReturns", () => {
  // ── Arrow function implicit returns ───────────────────────────────────────

  it("harvests implicit arrow return with string literal", () => {
    const fn = mockArrowImplicit(mockLiteral("home.foo"));
    expect(harvestFunctionReturns(fn, "getKey")).toEqual([
      { name: "getKey", value: "home.foo" },
    ]);
  });

  it("harvests implicit arrow return with ternary", () => {
    const fn = mockArrowImplicit({
      type: "ConditionalExpression",
      test: mockIdentifier("isAdmin"),
      consequent: mockLiteral("home.admin"),
      alternate: mockLiteral("home.user"),
    });
    const result = harvestFunctionReturns(fn, "getKey");
    expect(result).toContainEqual({ name: "getKey", value: "home.admin" });
    expect(result).toContainEqual({ name: "getKey", value: "home.user" });
  });

  it("harvests implicit arrow return with logical expression", () => {
    const fn = mockArrowImplicit({
      type: "LogicalExpression",
      operator: "||",
      left: mockIdentifier("dynamicKey"),
      right: mockLiteral("home.fallback"),
    });
    const result = harvestFunctionReturns(fn, "getKey");
    expect(result).toContainEqual({ name: "getKey", value: "home.fallback" });
  });

  it("returns empty array for implicit arrow returning non-string", () => {
    const fn = mockArrowImplicit(mockIdentifier("someVariable"));
    expect(harvestFunctionReturns(fn, "getKey")).toEqual([]);
  });

  // ── Arrow function block returns ───────────────────────────────────────────

  it("harvests explicit arrow return", () => {
    const fn = mockArrowBlock([mockReturnStatement("home.foo")]);
    expect(harvestFunctionReturns(fn, "getKey")).toEqual([
      { name: "getKey", value: "home.foo" },
    ]);
  });

  it("harvests multiple return paths in arrow block", () => {
    const fn = mockArrowBlock([
      mockReturnStatement("home.admin"),
      mockReturnStatement("home.user"),
    ]);
    const result = harvestFunctionReturns(fn, "getKey");
    expect(result).toContainEqual({ name: "getKey", value: "home.admin" });
    expect(result).toContainEqual({ name: "getKey", value: "home.user" });
  });

  it("returns empty array for arrow block with no return", () => {
    const fn: ArrowFunctionExpression = {
      type: "ArrowFunctionExpression",
      params: [],
      body: mockBlockStatement([]),
      expression: false,
      async: false,
      generator: false,
    };
    expect(harvestFunctionReturns(fn, "getKey")).toEqual([]);
  });

  it("returns empty array for arrow block returning void", () => {
    const fn: ArrowFunctionExpression = {
      type: "ArrowFunctionExpression",
      params: [],
      body: {
        type: "BlockStatement",
        body: [{ type: "ReturnStatement", argument: null }],
      },
      expression: false,
      async: false,
      generator: false,
    };
    expect(harvestFunctionReturns(fn, "getKey")).toEqual([]);
  });

  // ── FunctionExpression ─────────────────────────────────────────────────────

  it("harvests return from function expression", () => {
    const fn = mockFunctionExpression([mockReturnStatement("home.foo")]);
    expect(harvestFunctionReturns(fn, "getKey")).toEqual([
      { name: "getKey", value: "home.foo" },
    ]);
  });

  it("harvests multiple returns from function expression", () => {
    const fn = mockFunctionExpression([
      mockReturnStatement("home.first"),
      mockReturnStatement("home.second"),
    ]);
    const result = harvestFunctionReturns(fn, "getKey");
    expect(result).toContainEqual({ name: "getKey", value: "home.first" });
    expect(result).toContainEqual({ name: "getKey", value: "home.second" });
  });

  // ── FunctionDeclaration ────────────────────────────────────────────────────

  it("harvests return from function declaration", () => {
    const fn = mockFunctionDeclaration("getKey", [
      mockReturnStatement("home.foo"),
    ]);
    expect(harvestFunctionReturns(fn, "getKey")).toEqual([
      { name: "getKey", value: "home.foo" },
    ]);
  });

  it("harvests multiple returns from function declaration", () => {
    const fn = mockFunctionDeclaration("getKey", [
      mockReturnStatement("home.admin"),
      mockReturnStatement("home.user"),
    ]);
    const result = harvestFunctionReturns(fn, "getKey");
    expect(result).toContainEqual({ name: "getKey", value: "home.admin" });
    expect(result).toContainEqual({ name: "getKey", value: "home.user" });
  });

  // ── Nested returns ─────────────────────────────────────────────────────────

  it("harvests return with ternary in block body", () => {
    const fn = mockFunctionExpression([
      {
        type: "ReturnStatement",
        argument: {
          type: "ConditionalExpression",
          test: mockIdentifier("isAdmin"),
          consequent: mockLiteral("home.admin"),
          alternate: mockLiteral("home.user"),
        },
      },
    ]);
    const result = harvestFunctionReturns(fn, "getKey");
    expect(result).toContainEqual({ name: "getKey", value: "home.admin" });
    expect(result).toContainEqual({ name: "getKey", value: "home.user" });
  });
});
