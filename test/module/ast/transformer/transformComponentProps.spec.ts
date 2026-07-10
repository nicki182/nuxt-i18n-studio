import { KeyExtractionType } from "@ast/constants";
import { transformComponentProps } from "@ast/transformer/transformComponentProps";
import { NodeTypes } from "@vue/compiler-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const extractKeysMock = vi.hoisted(() => vi.fn());

vi.mock("@ast/helper", () => ({
  extractKeys: extractKeysMock,
}));

describe("transformComponentProps", () => {
  beforeEach(() => {
    extractKeysMock.mockReset();
  });

  it("adds a data-i18n-prop-ids attribute when matching prop candidates are found", () => {
    const el = {
      tag: "h1",
      loc: { source: "<h1 />" },
      props: [],
    } as never;

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
                  path: "src/components/Button.vue",
                  componentInitial: "Button",
                  componentEnd: "Button",
                  propName: "title",
                  element: "h1",
                },
              ],
            },
          ],
        ]),
      ],
    ]);

    transformComponentProps(el, new Map(), propKeyMap, new Map(), "Button");

    expect(el.props).toEqual([
      expect.objectContaining({
        type: NodeTypes.ATTRIBUTE,
        name: "data-i18n-prop-ids",
        value: expect.objectContaining({
          content: "button__title__0",
        }),
      }),
    ]);
  });

  it("returns traced payload entries for matching bound props", () => {
    extractKeysMock.mockReturnValue(["button.title"]);

    const el = {
      tag: "Button",
      loc: { source: '<Button :title="titleKey" />' },
      props: [
        {
          type: NodeTypes.DIRECTIVE,
          name: "bind",
          arg: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: "title",
          },
          exp: {
            loc: { source: "titleKey" },
          },
        },
      ],
    } as never;

    const componentInitialIndex = new Map([
      [
        "Button",
        new Map([
          [
            "title",
            [
              {
                propId: "button__title__0",
                element: "h1",
                componentEnd: "Button",
              },
            ],
          ],
        ]),
      ],
    ]);

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
                  path: "src/components/Button.vue",
                  componentInitial: "Button",
                  componentEnd: "Button",
                  propName: "title",
                  element: "h1",
                },
              ],
            },
          ],
        ]),
      ],
    ]);

    const result = transformComponentProps(
      el,
      componentInitialIndex,
      propKeyMap,
      new Map(),
      "Button",
    );

    expect(result).toEqual([
      expect.objectContaining({
        type: KeyExtractionType.Traced,
        key: "button.title",
        propId: "button__title__0",
        element: "h1",
        usageType: "prop:title",
        id: "__TRACED__title__button__title__0",
      }),
    ]);
  });

  it("returns no entries when there is no matching prop lookup", () => {
    extractKeysMock.mockReturnValue(["button.title"]);

    const el = {
      tag: "Button",
      loc: { source: '<Button :title="titleKey" />' },
      props: [
        {
          type: NodeTypes.DIRECTIVE,
          name: "bind",
          arg: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: "title",
          },
          exp: {
            loc: { source: "titleKey" },
          },
        },
      ],
    } as never;

    const result = transformComponentProps(
      el,
      new Map(),
      new Map(),
      new Map(),
      "Button",
    );

    expect(result).toEqual([]);
  });
});
