import { KeyExtractionType } from "@ast/constants";
import { resolveCallExpression } from "@ast/script/resolver/resolveCallExpression";
import { describe, expect, it } from "vitest";

describe("resolveCallExpression", () => {
  it("returns static keys for string literals", () => {
    const node = {
      type: "CallExpression",
      arguments: [{ type: "Literal", value: "home.title" }],
    } as never;

    const result = resolveCallExpression(node, "t('home.title')");

    expect(result).toEqual([
      {
        type: KeyExtractionType.Static,
        key: "home.title",
        id: "__STATIC__home.title",
      },
    ]);
  });

  it("resolves template literals", () => {
    const node = {
      type: "CallExpression",
      arguments: [
        {
          type: "TemplateLiteral",
          expressions: [],
          quasis: [
            {
              type: "TemplateElement",
              value: { cooked: "home.title", raw: "home.title" },
              tail: true,
            },
          ],
        },
      ],
    } as never;

    const result = resolveCallExpression(node, "t(`home.title`)");

    expect(result).toEqual([
      {
        type: KeyExtractionType.Direct,
        key: "home.title",
        id: "__STATIC__home.title",
      },
    ]);
  });

  it("resolves conditional expressions by visiting both branches", () => {
    const node = {
      type: "CallExpression",
      arguments: [
        {
          type: "ConditionalExpression",
          consequent: { type: "Literal", value: "home.admin" },
          alternate: { type: "Literal", value: "home.user" },
        },
      ],
    } as never;

    const result = resolveCallExpression(
      node,
      "t(cond ? 'home.admin' : 'home.user')",
    );

    expect(result).toEqual([
      {
        type: KeyExtractionType.Static,
        key: "home.admin",
        id: "__STATIC__home.admin",
      },
      {
        type: KeyExtractionType.Static,
        key: "home.user",
        id: "__STATIC__home.user",
      },
    ]);
  });

  it("returns a dynamic fallback for non-resolvable arguments", () => {
    const node = {
      type: "CallExpression",
      arguments: [
        {
          type: "Identifier",
          start: 0,
          end: 6,
        },
      ],
    } as never;

    const result = resolveCallExpression(node, "fooBar");

    expect(result).toEqual([
      {
        type: KeyExtractionType.Dynamic,
        expr: "fooBar",
        id: "__EXPR__fooBar",
      },
    ]);
  });
});
