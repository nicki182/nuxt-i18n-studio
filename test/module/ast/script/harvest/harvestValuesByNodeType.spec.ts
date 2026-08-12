import { describe, it, expect } from "vitest";

import { harvestValuesByNodeType } from "../../../../../src/ast/script/harvest/harvestValuesByNodeType";
import {
  mockDefinePropsCall,
  mockFunctionDeclaration,
  mockIdentifier,
  mockLiteral,
  mockObjectExpression,
  mockReturnStatement,
} from "../../mocks";

describe("harvestValuesByNodeType", () => {
  it("dispatches to the harvester for supported node types", () => {
    const assignmentNode = {
      type: "AssignmentExpression",
      operator: "=",
      left: mockIdentifier("pageKey"),
      right: mockLiteral("home.foo"),
    } as any;

    const variableNode = {
      type: "VariableDeclarator",
      id: mockIdentifier("pageKey"),
      init: mockLiteral("home.bar"),
    } as any;

    const functionNode = mockFunctionDeclaration("getKey", [
      mockReturnStatement("home.baz"),
    ]);

    const callNode = mockDefinePropsCall(
      mockObjectExpression(["titleKey", "labelKey"]),
    );

    expect(harvestValuesByNodeType(assignmentNode)).toEqual([
      { name: "pageKey", value: "home.foo" },
    ]);

    expect(harvestValuesByNodeType(variableNode)).toEqual([
      { name: "pageKey", value: "home.bar" },
    ]);

    expect(harvestValuesByNodeType(functionNode)).toEqual([
      { name: "getKey", value: "home.baz" },
    ]);

    expect(harvestValuesByNodeType(callNode)).toEqual([
      { name: "titleKey", value: "__PROP__", isProp: true },
      { name: "labelKey", value: "__PROP__", isProp: true },
    ]);
  });

  it("returns an empty array when no harvester matches the node type", () => {
    expect(
      harvestValuesByNodeType({
        type: "Identifier",
        name: "pageKey",
      } as any),
    ).toEqual([]);
  });
});
