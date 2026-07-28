import { resolveIdentifier } from "@ast/template/resolver/resolveIdentifier";
import { describe, expect, it } from "vitest";

describe("resolveIdentifier", () => {
  it("returns a dynamic fallback when the identifier is not in the value map", () => {
    const result = resolveIdentifier({
      node: { type: "Identifier", name: "unknownKey" } as never,
      rawSource: "unknownKey",
      valueMap: new Map(),
    });

    expect(result).toEqual([
      {
        type: "dynamic",
        expr: "unknownKey",
        candidates: [],
        id: "__EXPR__unknownKey",
      },
    ]);
  });

  it("returns a prop entry when the value is marked as a prop", () => {
    const result = resolveIdentifier({
      node: { type: "Identifier", name: "titleKey" } as never,
      rawSource: "titleKey",
      valueMap: new Map([["titleKey", ["__PROP__"]]]),
    });

    expect(result).toEqual([
      {
        type: "prop",
        propName: "titleKey",
        id: "__PROP__titleKey",
      },
    ]);
  });

  it("returns traced and static entries when the identifier resolves to candidates", () => {
    const result = resolveIdentifier({
      node: { type: "Identifier", name: "dynamicKey" } as never,
      rawSource: "dynamicKey",
      valueMap: new Map([["dynamicKey", ["home.first", "home.second"]]]),
    });

    expect(result).toEqual([
      {
        type: "traced",
        key: "home.first",
        allCandidates: ["home.first", "home.second"],
        id: "__TRACED__home.first",
      },
      {
        type: "static",
        key: "home.first",
        id: "__STATIC__home.first",
      },
      {
        type: "static",
        key: "home.second",
        id: "__STATIC__home.second",
      },
    ]);
  });
});
