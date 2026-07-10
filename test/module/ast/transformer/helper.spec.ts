import { hasTemplateVariableRef } from "@ast/transformer/helper";
import { NodeTypes } from "@vue/compiler-dom";
import { describe, expect, it } from "vitest";

describe("hasTemplateVariableRef", () => {
  it("returns true when an interpolation references a template variable", () => {
    const el = {
      children: [
        {
          type: NodeTypes.INTERPOLATION,
          content: {
            loc: { source: "message" },
          },
        },
      ],
      props: [],
    };

    const templateVariableMap = new Map([["message", []]]);

    expect(hasTemplateVariableRef(el as never, templateVariableMap)).toBe(true);
  });

  it("returns true when a bound attribute references a template variable", () => {
    const el = {
      children: [],
      props: [
        {
          type: NodeTypes.DIRECTIVE,
          name: "bind",
          exp: {
            loc: { source: "message" },
          },
        },
      ],
    };

    const templateVariableMap = new Map([["message", []]]);

    expect(hasTemplateVariableRef(el as never, templateVariableMap)).toBe(true);
  });

  it("returns false when no template variable references are present", () => {
    const el = {
      children: [],
      props: [],
    };

    const templateVariableMap = new Map([["other", []]]);

    expect(hasTemplateVariableRef(el as never, templateVariableMap)).toBe(
      false,
    );
  });
});
