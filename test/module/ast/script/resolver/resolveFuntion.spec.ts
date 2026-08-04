import { KeyExtractionType } from "@ast/constants";
import { resolveFunction } from "@ast/script/resolver/resolveFunction";
import { describe, expect, it } from "vitest";

describe("resolveFunction", () => {
  it("resolves an implicit arrow return", () => {
    const result = resolveFunction({
      node: {
        type: "ArrowFunctionExpression",
        body: {
          type: "CallExpression",
          callee: { type: "Identifier", name: "t" },
          arguments: [{ type: "Literal", value: "home.foo" }],
        },
      } as never,
      source: "() => t('home.foo')",
    });

    expect(result).toEqual([
      {
        type: KeyExtractionType.Static,
        key: "home.foo",
        id: "__STATIC__home.foo",
      },
    ]);
  });

  it("resolves a block body return statement", () => {
    const result = resolveFunction({
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
                arguments: [{ type: "Literal", value: "home.bar" }],
              },
            },
          ],
        },
      } as never,
      source: "function buildLabel() { return t('home.bar') }",
    });

    expect(result).toEqual([
      {
        type: KeyExtractionType.Static,
        key: "home.bar",
        id: "__STATIC__home.bar",
      },
    ]);
  });

  it("resolves direct expression statements inside a block body", () => {
    const result = resolveFunction({
      node: {
        type: "FunctionExpression",
        body: {
          type: "BlockStatement",
          body: [
            {
              type: "ExpressionStatement",
              expression: {
                type: "CallExpression",
                callee: { type: "Identifier", name: "t" },
                arguments: [{ type: "Literal", value: "home.baz" }],
              },
            },
          ],
        },
      } as never,
      source: "function () { t('home.baz') }",
    });

    expect(result).toEqual([
      {
        type: KeyExtractionType.Static,
        key: "home.baz",
        id: "__STATIC__home.baz",
      },
    ]);
  });
});
