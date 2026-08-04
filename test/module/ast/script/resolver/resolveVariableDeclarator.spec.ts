import { KeyExtractionType } from "@ast/constants";
import { resolveVariableDeclarator } from "@ast/script/resolver/resolveVariableDeclarator";
import { describe, expect, it } from "vitest";

describe("resolveVariableDeclarator", () => {
  it("returns an empty array for non-Identifier declarations", () => {
    const result = resolveVariableDeclarator({
      node: {
        type: "VariableDeclarator",
        id: { type: "ObjectPattern" },
        init: { type: "Literal", value: "home.title" },
      } as never,
      source: "const { title } = foo",
    });

    expect(result).toEqual([]);
  });

  it("resolves a direct t() initializer", () => {
    const result = resolveVariableDeclarator({
      node: {
        type: "VariableDeclarator",
        id: { type: "Identifier", name: "title" },
        init: {
          type: "CallExpression",
          callee: { type: "Identifier", name: "t" },
          arguments: [{ type: "Literal", value: "home.title" }],
        },
      } as never,
      source: "const title = t('home.title')",
    });

    expect(result).toEqual([
      {
        type: KeyExtractionType.Static,
        key: "home.title",
        id: "__STATIC__home.title",
      },
    ]);
  });
});
