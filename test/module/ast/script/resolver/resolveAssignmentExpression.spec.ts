import { KeyExtractionType } from "@ast/constants";
import { resolveAssignmentExpression } from "@ast/script/resolver/resolverAssignmentExpression";
import { describe, expect, it } from "vitest";

describe("resolveAssignmentExpression", () => {
  it("resolves the expression on the right-hand side", () => {
    const result = resolveAssignmentExpression({
      node: {
        type: "AssignmentExpression",
        right: {
          type: "CallExpression",
          callee: { type: "Identifier", name: "t" },
          arguments: [{ type: "Literal", value: "home.message" }],
        },
      } as never,
      source: "message = t('home.message')",
    });

    expect(result).toEqual([
      {
        type: KeyExtractionType.Static,
        key: "home.message",
        id: "__STATIC__home.message",
      },
    ]);
  });
});
