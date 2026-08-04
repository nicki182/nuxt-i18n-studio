import { KeyExtractionType } from "@ast/constants";
import { nodeResolver } from "@ast/script/resolver/nodeResolver";
import { describe, expect, it } from "vitest";

describe("nodeResolver", () => {
  it("resolves variable declarators", () => {
    const result = nodeResolver({
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

  it("resolves function declarations", () => {
    const result = nodeResolver({
      node: {
        type: "FunctionDeclaration",
        id: { type: "Identifier", name: "buildLabel" },
        body: {
          type: "BlockStatement",
          body: [
            {
              type: "ReturnStatement",
              argument: {
                type: "CallExpression",
                callee: { type: "Identifier", name: "t" },
                arguments: [{ type: "Literal", value: "home.label" }],
              },
            },
          ],
        },
      } as never,
      source: "function buildLabel() { return t('home.label') }",
    });

    expect(result).toEqual([
      {
        type: KeyExtractionType.Static,
        key: "home.label",
        id: "__STATIC__home.label",
      },
    ]);
  });

  it("resolves assignment expressions", () => {
    const result = nodeResolver({
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

  it("returns an empty array for unsupported or null nodes", () => {
    expect(nodeResolver({ node: null as never, source: "" })).toEqual([]);
    expect(
      nodeResolver({
        node: { type: "Literal", value: "home.title" } as never,
        source: "",
      }),
    ).toEqual([]);
  });
});
