import { resolveConditionalExpression } from "@ast/template/resolver/resolveConditionalExpression";
import { describe, expect, it } from "vitest";

describe("resolveConditionalExpression", () => {
  it("resolves both branches of a conditional expression", () => {
    const node = {
      type: "ConditionalExpression",
      test: { type: "Identifier", name: "isAdmin" },
      consequent: { type: "Literal", value: "home.admin" },
      alternate: { type: "Literal", value: "home.user" },
    } as never;

    const result = resolveConditionalExpression({
      node,
      rawSource: "isAdmin ? 'home.admin' : 'home.user'",
      valueMap: new Map(),
    });

    expect(result).toEqual([
      {
        type: "static",
        key: "home.admin",
        id: "__STATIC__home.admin",
      },
      {
        type: "static",
        key: "home.user",
        id: "__STATIC__home.user",
      },
    ]);
  });
});
