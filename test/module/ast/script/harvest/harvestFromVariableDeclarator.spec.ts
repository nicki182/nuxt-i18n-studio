import { describe, it, expect } from "vitest";

import { harvestFromVariableDeclarator } from "../../../../../src/ast/script/harvest/harvestFromVariableDeclarator";
import {
  mockArrowImplicit,
  mockFunctionExpression,
  mockIdentifier,
  mockLiteral,
  mockReturnStatement,
} from "../../mocks";

describe("harvestFromVariableDeclarator", () => {
  it("harvests a string from ref() initialization", () => {
    const node = {
      type: "VariableDeclarator",
      id: mockIdentifier("pageKey"),
      init: {
        type: "CallExpression",
        callee: mockIdentifier("ref"),
        arguments: [mockLiteral("home.foo")],
        optional: false,
      },
    } as any;

    expect(harvestFromVariableDeclarator(node)).toEqual([
      { name: "pageKey", value: "home.foo" },
    ]);
  });

  it("harvests a string from reactive() initialization", () => {
    const node = {
      type: "VariableDeclarator",
      id: mockIdentifier("pageKey"),
      init: {
        type: "CallExpression",
        callee: mockIdentifier("reactive"),
        arguments: [mockLiteral("home.bar")],
        optional: false,
      },
    } as any;

    expect(harvestFromVariableDeclarator(node)).toEqual([
      { name: "pageKey", value: "home.bar" },
    ]);
  });

  it("harvests a direct string literal assignment", () => {
    const node = {
      type: "VariableDeclarator",
      id: mockIdentifier("pageKey"),
      init: mockLiteral("home.direct"),
    } as any;

    expect(harvestFromVariableDeclarator(node)).toEqual([
      { name: "pageKey", value: "home.direct" },
    ]);
  });

  it("harvests implicit return values from an arrow function initializer", () => {
    const node = {
      type: "VariableDeclarator",
      id: mockIdentifier("pageKey"),
      init: mockArrowImplicit({
        type: "ConditionalExpression",
        test: mockIdentifier("isAdmin"),
        consequent: mockLiteral("home.admin"),
        alternate: mockLiteral("home.user"),
      }),
    } as any;

    const result = harvestFromVariableDeclarator(node);
    expect(result).toContainEqual({ name: "pageKey", value: "home.admin" });
    expect(result).toContainEqual({ name: "pageKey", value: "home.user" });
  });

  it("harvests multiple return values from a function expression initializer", () => {
    const node = {
      type: "VariableDeclarator",
      id: mockIdentifier("pageKey"),
      init: mockFunctionExpression([
        mockReturnStatement("home.first"),
        mockReturnStatement("home.second"),
      ]),
    } as any;

    const result = harvestFromVariableDeclarator(node);
    expect(result).toContainEqual({ name: "pageKey", value: "home.first" });
    expect(result).toContainEqual({ name: "pageKey", value: "home.second" });
  });

  it("harvests strings from conditional and logical expressions", () => {
    const conditionalNode = {
      type: "VariableDeclarator",
      id: mockIdentifier("pageKey"),
      init: {
        type: "ConditionalExpression",
        test: mockIdentifier("isAdmin"),
        consequent: mockLiteral("home.admin"),
        alternate: mockLiteral("home.user"),
      },
    } as any;

    const logicalNode = {
      type: "VariableDeclarator",
      id: mockIdentifier("pageKey"),
      init: {
        type: "LogicalExpression",
        operator: "||",
        left: mockIdentifier("fallbackKey"),
        right: mockLiteral("home.fallback"),
      },
    } as any;

    expect(harvestFromVariableDeclarator(conditionalNode)).toContainEqual({
      name: "pageKey",
      value: "home.admin",
    });

    expect(harvestFromVariableDeclarator(logicalNode)).toEqual([
      { name: "pageKey", value: "home.fallback" },
    ]);
  });

  it("returns undefined for non-Identifier declarators and empty result for unsupported initializers", () => {
    const destructured = {
      type: "VariableDeclarator",
      id: { type: "ObjectPattern", properties: [] },
      init: mockLiteral("home.foo"),
    } as any;

    const unsupported = {
      type: "VariableDeclarator",
      id: mockIdentifier("pageKey"),
      init: { type: "Identifier", name: "someValue" },
    } as any;

    expect(harvestFromVariableDeclarator(destructured)).toBeUndefined();
    expect(harvestFromVariableDeclarator(unsupported)).toEqual([]);
  });
});
