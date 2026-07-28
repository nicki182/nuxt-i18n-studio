import { buildPropRefs } from "@ast/template/scanComponent/buildPropRefs";
import { describe, expect, it } from "vitest";

describe("buildPropRefs", () => {
  it("includes the original prop name and variables that reference props.<propName>", () => {
    const refs = buildPropRefs(
      "title",
      new Map([["title", ["__PROP__"]]]),
      "const label = props.title; const extra = label;",
    );

    expect(Array.from(refs)).toEqual(
      expect.arrayContaining(["title", "label"]),
    );
  });

  it("keeps the prop name even when the script cannot be parsed", () => {
    const refs = buildPropRefs("title", new Map(), "not valid js");

    expect(Array.from(refs)).toEqual(["title"]);
  });
});
