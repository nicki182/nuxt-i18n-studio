import { checkNativeLeaf } from "@ast/template/scanComponent/checkNativeLeaf";
import { NodeTypes } from "@vue/compiler-dom";
import { describe, expect, it } from "vitest";

describe("checkNativeLeaf", () => {
  it("records a candidate for interpolated text using a matching prop reference", () => {
    const propKeyMap = new Map() as never;
    const ctx = { propKeyMap } as never;

    checkNativeLeaf(
      {
        tag: "span",
        tagType: 0,
        children: [
          {
            type: NodeTypes.INTERPOLATION,
            content: {
              loc: { source: "message" },
            },
          },
        ],
        props: [],
      } as never,
      new Set(["message"]),
      {
        componentName: "Button",
        sourcePath: "/src/Button.vue",
        componentInitial: "Button",
        componentEnd: "Button",
        propName: "title",
        key: "home.title",
      } as never,
      ctx,
    );

    expect(propKeyMap.get("Button").get("title")).toEqual({
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

  it("records a candidate for bound attributes using a matching prop reference", () => {
    const propKeyMap = new Map() as never;
    const ctx = { propKeyMap } as never;

    checkNativeLeaf(
      {
        tag: "img",
        tagType: 0,
        children: [],
        props: [
          {
            type: NodeTypes.DIRECTIVE,
            name: "bind",
            arg: { content: "alt" },
            exp: { loc: { source: "message" } },
          },
        ],
      } as never,
      new Set(["message"]),
      {
        componentName: "Button",
        sourcePath: "/src/Button.vue",
        componentInitial: "Button",
        componentEnd: "Button",
        propName: "title",
        key: "home.title",
      } as never,
      ctx,
    );

    expect(propKeyMap.get("Button").get("title")).toEqual({
      element: "img[alt]",
      candidates: [
        {
          key: "home.title",
          path: "/src/Button.vue",
          componentInitial: "Button",
          componentEnd: "Button",
          propName: "title",
          element: "img[alt]",
        },
      ],
    });
  });
});
