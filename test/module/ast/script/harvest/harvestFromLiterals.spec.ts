import { describe, it, expect } from "vitest";

import { harvestLiterals } from "../../../../../src/ast/script/harvest/harvestFromLiterals";
import { mockIdentifier, mockLiteral } from "../../mocks";

describe("harvestLiterals", () => {
  it("harvests a plain string literal", () => {
    expect(harvestLiterals(mockLiteral("home.foo"), "pageKey")).toEqual([
      { name: "pageKey", value: "home.foo" },
    ]);
  });

  it("harvests both branches of a conditional expression", () => {
    const node = {
      type: "ConditionalExpression",
      test: mockIdentifier("isAdmin"),
      consequent: mockLiteral("home.admin"),
      alternate: mockLiteral("home.user"),
    } as any;

    const result = harvestLiterals(node, "pageKey");
    expect(result).toContainEqual({ name: "pageKey", value: "home.admin" });
    expect(result).toContainEqual({ name: "pageKey", value: "home.user" });
  });

  it("harvests the right-hand string from a logical expression", () => {
    const node = {
      type: "LogicalExpression",
      operator: "||",
      left: mockIdentifier("fallbackKey"),
      right: mockLiteral("home.fallback"),
    } as any;

    expect(harvestLiterals(node, "pageKey")).toEqual([
      { name: "pageKey", value: "home.fallback" },
    ]);
  });

  it("harvests a template literal with no expressions", () => {
    const node = {
      type: "TemplateLiteral",
      quasis: [
        {
          type: "TemplateElement",
          value: { raw: "home.title", cooked: "home.title" },
          tail: true,
        },
      ],
      expressions: [],
    };

    expect(harvestLiterals(node, "pageKey")).toEqual([
      { name: "pageKey", value: "home.title" },
    ]);
  });

  it("ignores non-string literals and unsupported node types", () => {
    expect(
      harvestLiterals({ type: "Literal", value: 123, raw: "123" }, "pageKey"),
    ).toEqual([]);

    expect(
      harvestLiterals({ type: "Identifier", name: "pageKey" }, "pageKey"),
    ).toEqual([]);
  });
});
