import { tracePropUsage } from "@ast/template/scanComponent/tracePropUsage";
import { NodeTypes } from "@vue/compiler-dom";
import { describe, expect, it } from "vitest";

describe("tracePropUsage", () => {
  it("walks nested children and records candidates for matching leaves", () => {
    const propKeyMap = new Map() as never;
    const ctx = { propKeyMap } as never;

    tracePropUsage(
      {
        type: NodeTypes.ELEMENT,
        tag: "div",
        tagType: 0,
        children: [
          {
            type: NodeTypes.ELEMENT,
            tag: "span",
            tagType: 0,
            children: [
              {
                type: NodeTypes.INTERPOLATION,
                content: { loc: { source: "message" } },
              },
            ],
            props: [],
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
});
