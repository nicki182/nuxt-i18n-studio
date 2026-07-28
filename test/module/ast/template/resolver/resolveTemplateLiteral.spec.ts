import { resolveTemplateLiteral } from "@ast/template/resolver/resolveTemplateLiteral";
import { describe, expect, it } from "vitest";

describe("resolveTemplateLiteral", () => {
  it("returns a static key for a template literal without expressions", () => {
    const node = {
      type: "TemplateLiteral",
      expressions: [],
      quasis: [
        {
          type: "TemplateElement",
          value: { cooked: "home.title", raw: "home.title" },
          tail: true,
        },
      ],
    } as never;

    const result = resolveTemplateLiteral({ node, valueMap: new Map() });

    expect(result).toEqual([
      {
        type: "static",
        key: "home.title",
        id: "__STATIC__home.title",
      },
    ]);
  });

  it("returns a prefix entry when the template literal contains expressions", () => {
    const node = {
      type: "TemplateLiteral",
      expressions: [{ type: "Identifier", name: "code" }],
      quasis: [
        {
          type: "TemplateElement",
          value: { cooked: "errors.", raw: "errors." },
          tail: false,
        },
        {
          type: "TemplateElement",
          value: { cooked: "", raw: "" },
          tail: true,
        },
      ],
    } as never;

    const result = resolveTemplateLiteral({ node, valueMap: new Map() });

    expect(result).toEqual([
      {
        type: "prefix",
        prefix: "errors.",
        id: "__PREFIX__errors.",
      },
    ]);
  });
});
