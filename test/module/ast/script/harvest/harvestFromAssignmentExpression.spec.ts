import { describe, it, expect } from "vitest";

import { harvestFromAssignmentExpression } from "../../../../../src/ast/script/harvest/harvestFromAssignmentExpression";
import {
  mockIdentifier,
  mockLiteral,
  mockMemberExpression,
  mockAssignment,
} from "../../mocks";

// ── harvestFromAssignmentExpression ───────────────────────────────────────────

describe("harvestFromAssignmentExpression", () => {
  // ── ref .value assignments ────────────────────────────────────────────────

  it("harvests key.value = 'string' ref assignment", () => {
    const node = mockAssignment(
      mockMemberExpression("key", "value"),
      mockLiteral("home.foo"),
    );
    const result = harvestFromAssignmentExpression(node);
    expect(result).toEqual([{ name: "key", value: "home.foo" }]);
  });

  it("harvests key.value = ternary — both branches", () => {
    const node = mockAssignment(mockMemberExpression("key", "value"), {
      type: "ConditionalExpression",
      test: mockIdentifier("isAdmin"),
      consequent: mockLiteral("home.admin"),
      alternate: mockLiteral("home.user"),
    });
    const result = harvestFromAssignmentExpression(node);
    expect(result).toContainEqual({ name: "key", value: "home.admin" });
    expect(result).toContainEqual({ name: "key", value: "home.user" });
  });

  it("ignores computed member expression key[value]", () => {
    const node = mockAssignment(
      mockMemberExpression("key", "value", true), // computed = true
      mockLiteral("home.foo"),
    );
    const result = harvestFromAssignmentExpression(node);
    expect(result).toBeUndefined();
  });

  it("ignores member expression where property is not 'value'", () => {
    const node = mockAssignment(
      mockMemberExpression("key", "other"),
      mockLiteral("home.foo"),
    );
    const result = harvestFromAssignmentExpression(node);
    expect(result).toBeUndefined();
  });

  it("ignores member expression where object is not an identifier", () => {
    const node = mockAssignment(
      {
        type: "MemberExpression",
        object: {
          type: "MemberExpression",
          object: mockIdentifier("obj"),
          property: mockIdentifier("key"),
          computed: false,
          optional: false,
        },
        property: mockIdentifier("value"),
        computed: false,
        optional: false,
      },
      mockLiteral("home.foo"),
    );
    const result = harvestFromAssignmentExpression(node);
    expect(result).toBeUndefined();
  });

  // ── Plain identifier assignments ───────────────────────────────────────────

  it("harvests plain identifier assignment", () => {
    const node = mockAssignment(mockIdentifier("key"), mockLiteral("home.foo"));
    const result = harvestFromAssignmentExpression(node);
    expect(result).toEqual([{ name: "key", value: "home.foo" }]);
  });

  it("harvests plain identifier assignment with ternary", () => {
    const node = mockAssignment(mockIdentifier("key"), {
      type: "ConditionalExpression",
      test: mockIdentifier("isAdmin"),
      consequent: mockLiteral("home.admin"),
      alternate: mockLiteral("home.user"),
    });
    const result = harvestFromAssignmentExpression(node);
    expect(result).toContainEqual({ name: "key", value: "home.admin" });
    expect(result).toContainEqual({ name: "key", value: "home.user" });
  });

  it("returns undefined for destructuring assignment", () => {
    const node = mockAssignment(
      { type: "ObjectPattern", properties: [] },
      mockLiteral("home.foo"),
    );
    const result = harvestFromAssignmentExpression(node);
    expect(result).toBeUndefined();
  });

  it("returns undefined for array pattern assignment", () => {
    const node = mockAssignment(
      { type: "ArrayPattern", elements: [] },
      mockLiteral("home.foo"),
    );
    const result = harvestFromAssignmentExpression(node);
    expect(result).toBeUndefined();
  });

  it("returns empty array when right side has no string literals", () => {
    const node = mockAssignment(
      mockIdentifier("key"),
      mockIdentifier("someVariable"),
    );
    const result = harvestFromAssignmentExpression(node);
    expect(result).toEqual([]);
  });
});
