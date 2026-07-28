import {
  hasChildren,
  isDirectiveNode,
  isElementNode,
  isInterpolationNode,
  recordCandidate,
  referencesPropsAccess,
} from "@ast/template/scanComponent/helper";
import { NodeTypes } from "@vue/compiler-dom";
import { describe, expect, it } from "vitest";

describe("scanComponent helper", () => {
  it("detects element nodes", () => {
    expect(isElementNode({ type: NodeTypes.ELEMENT })).toBe(true);
    expect(isElementNode({ type: NodeTypes.INTERPOLATION })).toBe(false);
    expect(isElementNode(null)).toBe(false);
  });

  it("records candidates without duplicating the same key/path", () => {
    const propKeyMap = new Map<
      string,
      Map<
        string,
        { element: string; candidates: Array<{ key: string; path: string }> }
      >
    >() as never;

    recordCandidate(propKeyMap, "Button", "title", {
      key: "home.title",
      path: "/src/Button.vue",
      componentInitial: "Button",
      componentEnd: "Button",
      propName: "title",
      element: "span",
    });

    recordCandidate(propKeyMap, "Button", "title", {
      key: "home.title",
      path: "/src/Button.vue",
      componentInitial: "Button",
      componentEnd: "Button",
      propName: "title",
      element: "span",
    });

    const entry = propKeyMap.get("Button")?.get("title");
    expect(entry).toEqual({
      element: "span",
      candidates: [
        {
          key: "home.title",
          path: "/src/Button.vue",
          componentInitial: "Button",
          componentEnd: "Button",
          propName: "title",
          element: "span",
        },
      ],
    });
  });

  it("detects props access in member expressions", () => {
    const node = {
      type: "MemberExpression",
      object: { type: "Identifier", name: "props" },
      property: { type: "Identifier", name: "title" },
    };

    expect(referencesPropsAccess(node as never, "title")).toBe(true);
    expect(referencesPropsAccess(node as never, "message")).toBe(false);
  });

  it("detects interpolation and directive nodes", () => {
    expect(isInterpolationNode({ type: NodeTypes.INTERPOLATION })).toBe(true);
    expect(isInterpolationNode({ type: NodeTypes.ELEMENT })).toBe(false);

    expect(isDirectiveNode({ type: NodeTypes.DIRECTIVE })).toBe(true);
    expect(isDirectiveNode({ type: NodeTypes.ELEMENT })).toBe(false);
  });

  it("detects children arrays", () => {
    expect(hasChildren({ children: [] })).toBe(true);
    expect(hasChildren({})).toBe(false);
  });
});
