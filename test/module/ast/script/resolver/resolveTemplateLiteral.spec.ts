import { KeyExtractionType } from "@ast/constants";
import { resolveTemplateLiteral } from "@ast/script/resolver/resolveTemplateLiteral";
import { describe, expect, it } from "vitest";

describe("resolveTemplateLiteral", () => {
  it("returns a direct static resolver for a template literal without expressions", () => {
    const result = resolveTemplateLiteral({
      node: {
        type: "TemplateLiteral",
        expressions: [],
        quasis: [
          {
            type: "TemplateElement",
            value: { cooked: "home.title", raw: "home.title" },
            tail: true,
          },
        ],
      } as never,
      source: "t(`home.title`)",
    });

    expect(result).toEqual([
      {
        type: KeyExtractionType.Direct,
        key: "home.title",
        id: "__STATIC__home.title",
      },
    ]);
  });

  it("returns a prefix resolver when the template literal contains expressions", () => {
    const result = resolveTemplateLiteral({
      node: {
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
      } as never,
      source: "t(`errors.${code}`)",
    });

    expect(result).toEqual([
      {
        type: KeyExtractionType.Prefix,
        prefix: "errors.",
        id: "__PREFIX__errors.",
      },
    ]);
  });
});
