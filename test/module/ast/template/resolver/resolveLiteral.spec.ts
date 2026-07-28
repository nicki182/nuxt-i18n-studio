import { resolveLiteral } from "@ast/template/resolver/resolveLiteral";
import { describe, expect, it } from "vitest";

describe("resolveLiteral", () => {
  it("returns a static key for a non-empty string literal", () => {
    const result = resolveLiteral({
      node: { type: "Literal", value: "home.title" } as never,
    });

    expect(result).toEqual([
      {
        type: "static",
        key: "home.title",
        id: "__STATIC__home.title",
      },
    ]);
  });

  it("returns an empty array for empty string literals", () => {
    const result = resolveLiteral({
      node: { type: "Literal", value: "" } as never,
    });

    expect(result).toEqual([]);
  });

  it("returns an empty array for non-string literals", () => {
    const result = resolveLiteral({
      node: { type: "Literal", value: 42 } as never,
    });

    expect(result).toEqual([]);
  });
});
