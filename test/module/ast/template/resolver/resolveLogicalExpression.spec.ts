import { resolveLogicalExpression } from "@ast/template/resolver/resolveLogicalExpression";
import { describe, expect, it } from "vitest";

describe("resolveLogicalExpression", () => {
  it("resolves both sides of a logical expression", () => {
    const node = {
      type: "LogicalExpression",
      operator: "||",
      left: { type: "Literal", value: "home.left" },
      right: { type: "Literal", value: "home.right" },
    } as never;

    const result = resolveLogicalExpression({
      node,
      rawSource: "home.left || home.right",
      valueMap: new Map(),
    });

    expect(result).toEqual([
      {
        type: "static",
        key: "home.left",
        id: "__STATIC__home.left",
      },
      {
        type: "static",
        key: "home.right",
        id: "__STATIC__home.right",
      },
    ]);
  });
});
