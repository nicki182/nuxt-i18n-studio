import type { CallExpression, SpreadElement } from "estree";

import { describe, it, expect } from "vitest";

import { harvestFromCallExpression } from "../../../../../src/ast/script/harvest/harvestFromCallExpression";
import {
  mockArrayExpression,
  mockOtherCall,
  mockObjectExpression,
  mockIdentifier,
  mockDefinePropsCall,
  mockLiteral,
  mockProperty,
} from "../../mocks";

// ── harvestFromCallExpression ─────────────────────────────────────────────────

describe("harvestFromCallExpression", () => {
  // ── Non-defineProps calls ──────────────────────────────────────────────────

  it("returns undefined for non-defineProps call", () => {
    expect(harvestFromCallExpression(mockOtherCall("ref"))).toBeUndefined();
    expect(
      harvestFromCallExpression(mockOtherCall("reactive")),
    ).toBeUndefined();
    expect(
      harvestFromCallExpression(mockOtherCall("computed")),
    ).toBeUndefined();
  });

  it("returns undefined when callee is a member expression", () => {
    const node: CallExpression = {
      type: "CallExpression",
      callee: {
        type: "MemberExpression",
        object: mockIdentifier("obj"),
        property: mockIdentifier("defineProps"),
        computed: false,
        optional: false,
      },
      arguments: [],
      optional: false,
    };
    expect(harvestFromCallExpression(node)).toBeUndefined();
  });

  // ── defineProps with no arguments ─────────────────────────────────────────

  it("returns empty array for defineProps with no arguments", () => {
    expect(harvestFromCallExpression(mockDefinePropsCall())).toEqual([]);
  });

  // ── Object expression syntax ───────────────────────────────────────────────

  it("harvests identifier key props from object syntax", () => {
    const node = mockDefinePropsCall(
      mockObjectExpression(["titleKey", "labelKey"]),
    );
    const result = harvestFromCallExpression(node);
    expect(result).toContainEqual({
      name: "titleKey",
      value: "__PROP__",
      isProp: true,
    });
    expect(result).toContainEqual({
      name: "labelKey",
      value: "__PROP__",
      isProp: true,
    });
  });

  it("harvests literal key props from object syntax", () => {
    const node = mockDefinePropsCall({
      type: "ObjectExpression",
      properties: [
        {
          type: "Property",
          key: mockLiteral("titleKey"),
          value: mockIdentifier("String"),
          kind: "init",
          method: false,
          shorthand: false,
          computed: false,
        },
      ],
    });
    const result = harvestFromCallExpression(node);
    expect(result).toContainEqual({
      name: "titleKey",
      value: "__PROP__",
      isProp: true,
    });
  });

  it("skips spread elements in object syntax", () => {
    const spread: SpreadElement = {
      type: "SpreadElement",
      argument: mockIdentifier("otherProps"),
    };
    const node = mockDefinePropsCall({
      type: "ObjectExpression",
      properties: [spread, mockProperty("titleKey")],
    });
    const result = harvestFromCallExpression(node);
    expect(result).toHaveLength(1);
    expect(result).toContainEqual({
      name: "titleKey",
      value: "__PROP__",
      isProp: true,
    });
  });

  it("skips computed property keys", () => {
    const node = mockDefinePropsCall({
      type: "ObjectExpression",
      properties: [
        {
          type: "Property",
          key: mockIdentifier("dynamic"),
          value: mockIdentifier("String"),
          kind: "init",
          method: false,
          shorthand: false,
          computed: true, // computed key — skip
        },
        mockProperty("titleKey"),
      ],
    });
    // computed key produces null propName so gets skipped
    const result = harvestFromCallExpression(node);
    expect(result).toContainEqual({
      name: "titleKey",
      value: "__PROP__",
      isProp: true,
    });
  });

  // ── Array syntax ───────────────────────────────────────────────────────────

  it("harvests props from array syntax", () => {
    const node = mockDefinePropsCall(
      mockArrayExpression(["titleKey", "labelKey"]),
    );
    const result = harvestFromCallExpression(node);
    expect(result).toContainEqual({
      name: "titleKey",
      value: "__PROP__",
      isProp: true,
    });
    expect(result).toContainEqual({
      name: "labelKey",
      value: "__PROP__",
      isProp: true,
    });
  });

  it("skips non-string literals in array syntax", () => {
    const node = mockDefinePropsCall({
      type: "ArrayExpression",
      elements: [
        mockLiteral("titleKey"),
        { type: "Literal", value: 42, raw: "42" }, // number — skip
      ],
    });
    const result = harvestFromCallExpression(node);
    expect(result).toHaveLength(1);
    expect(result).toContainEqual({
      name: "titleKey",
      value: "__PROP__",
      isProp: true,
    });
  });

  it("skips null (sparse) elements in array syntax", () => {
    const node = mockDefinePropsCall({
      type: "ArrayExpression",
      elements: [null, mockLiteral("titleKey"), null],
    });
    const result = harvestFromCallExpression(node);
    expect(result).toHaveLength(1);
  });

  it("skips spread elements in array syntax", () => {
    const node = mockDefinePropsCall({
      type: "ArrayExpression",
      elements: [
        mockLiteral("titleKey"),
        {
          type: "SpreadElement",
          argument: mockIdentifier("rest"),
        } as SpreadElement,
      ],
    });
    const result = harvestFromCallExpression(node);
    expect(result).toHaveLength(1);
  });
});
