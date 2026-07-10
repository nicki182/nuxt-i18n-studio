import { serializePropKeyMap } from "@ast/analyzer/serializePropKeyMap";
import { describe, expect, it } from "vitest";

describe("serializePropKeyMap", () => {
  it("serializes prop candidates into component-end and component-initial indexes", () => {
    const propKeyMap = new Map([
      [
        "Button",
        new Map([
          [
            "title",
            {
              element: "h1",
              candidates: [
                {
                  id: "button__title__0",
                  key: "button.title",
                  componentInitial: "Input",
                  componentEnd: "Button",
                  element: "h1",
                },
              ],
            },
          ],
        ]),
      ],
    ]) as never;

    const result = serializePropKeyMap(propKeyMap);

    expect(result).toEqual({
      byComponentEnd: {
        Button: {
          title: {
            element: "h1",
            candidates: [
              {
                id: "button__title__0",
                key: "button.title",
                componentInitial: "Input",
                componentEnd: "Button",
                element: "h1",
              },
            ],
          },
        },
      },
      byComponentInitial: {
        Input: {
          title: [
            {
              propId: "button__title__0",
              element: "h1",
              componentEnd: "Button",
            },
          ],
        },
      },
    });
  });

  it("skips props that have no candidates", () => {
    const propKeyMap = new Map([
      [
        "Button",
        new Map([
          [
            "title",
            {
              element: "h1",
              candidates: [],
            },
          ],
        ]),
      ],
    ]) as never;

    const result = serializePropKeyMap(propKeyMap);

    expect(result).toEqual({ byComponentEnd: {}, byComponentInitial: {} });
  });
});
