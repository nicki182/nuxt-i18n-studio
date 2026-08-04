import { KeyExtractionType } from "@ast/constants";
import { resolveLiteral } from "@ast/script/resolver/resolveLiteral";
import { describe, expect, it } from "vitest";

describe("resolveLiteral", () => {
  it("returns a static resolver for a non-empty string literal", () => {
    const result = resolveLiteral({
      node: { type: "Literal", value: "home.title" } as never,
    });

    expect(result).toEqual([
      {
        type: KeyExtractionType.Static,
        key: "home.title",
        id: "__STATIC__home.title",
      },
    ]);
  });

  it("returns an empty array for empty or non-string literals", () => {
    expect(
      resolveLiteral({
        node: { type: "Literal", value: "" } as never,
      }),
    ).toEqual([]);

    expect(
      resolveLiteral({
        node: { type: "Literal", value: 42 } as never,
      }),
    ).toEqual([]);
  });
});
