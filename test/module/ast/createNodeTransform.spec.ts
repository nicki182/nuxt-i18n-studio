import { createTemplateNodeTransform } from "@ast/createTemplateNodeTransform";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createI18nTransformerMock } = vi.hoisted(() => ({
  createI18nTransformerMock: vi.fn(),
}));

vi.mock("@ast/transformer", () => ({
  createI18nTransformer: createI18nTransformerMock,
}));


describe("createTemplateNodeTransform", () => {
  beforeEach(() => {
    createI18nTransformerMock.mockReset();
  });

  it("delegates to createI18nTransformer with the correct context", () => {
    const delegate = vi.fn();
    createI18nTransformerMock.mockReturnValue(delegate);

    const plugin = {
      _valueMapCache: new Map([
        [
          "/src/components/HelloWorld.vue",
          new Map([["title", ["home.title"]]]),
        ],
      ]),
      _templateMapCache: new Map([
        [
          "/src/components/HelloWorld.vue",
          new Map([["message", ["home.message"]]]),
        ],
      ]),
      _propKeyMap: new Map([["Button", new Map()]]),
      _componentInitialIndex: new Map([["Button", new Map()]]),
    };

    const transform = createTemplateNodeTransform(plugin as never);
    const node = { type: "Element" };
    const context = { filename: "/src/components/HelloWorld.vue" };

    transform(node as never, context as never);

    expect(createI18nTransformerMock).toHaveBeenCalledWith(
      plugin._valueMapCache.get("/src/components/HelloWorld.vue"),
      plugin._templateMapCache.get("/src/components/HelloWorld.vue"),
      plugin._propKeyMap,
      plugin._componentInitialIndex,
      "HelloWorld",
    );

    expect(delegate).toHaveBeenCalledWith(node, context);
  });
});
