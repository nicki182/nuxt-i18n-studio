import { createI18nTransformer } from "@ast/transformer/createI18nTransformer";
import { NodeTypes } from "@vue/compiler-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  injectI18nDirectiveMock,
  transformComponentPropsMock,
  extractDeclaredKeysMock,
  extractInFileTranslationsMock,
} = vi.hoisted(() => ({
  injectI18nDirectiveMock: vi.fn(),
  transformComponentPropsMock: vi.fn(),
  extractDeclaredKeysMock: vi.fn(),
  extractInFileTranslationsMock: vi.fn(),
}));

vi.mock("@ast/helper", () => ({
  injectI18nDirective: injectI18nDirectiveMock,
}));

vi.mock("@ast/transformer/extractDeclaredKeys", () => ({
  extractDeclaredKeys: extractDeclaredKeysMock,
}));

vi.mock("@ast/transformer/extractInFileTranslations", () => ({
  extractInFileTranslations: extractInFileTranslationsMock,
}));

vi.mock("@ast/transformer/transformComponentProps", () => ({
  transformComponentProps: transformComponentPropsMock,
}));

describe("createI18nTransformer", () => {
  beforeEach(() => {
    injectI18nDirectiveMock.mockReset();
    transformComponentPropsMock.mockReset();
    extractDeclaredKeysMock.mockReset();
    extractInFileTranslationsMock.mockReset();
  });

  it("does nothing for non-element nodes", () => {
    const transformer = createI18nTransformer(
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      "HelloWorld",
    );

    transformer({ type: "Text" } as never, {} as never);

    expect(transformComponentPropsMock).not.toHaveBeenCalled();
    expect(injectI18nDirectiveMock).not.toHaveBeenCalled();
  });

  it("skips wrapped elements and slot/template tags", () => {
    const transformer = createI18nTransformer(
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      "HelloWorld",
    );

    const wrapped = {
      type: NodeTypes.ELEMENT,
      __i18nWrapped: true,
      tagType: 0,
      props: [],
      children: [],
      tag: "div",
    } as never;

    const slot = {
      type: NodeTypes.ELEMENT,
      __i18nWrapped: false,
      tagType: 2,
      props: [],
      children: [],
      tag: "slot",
    } as never;

    const template = {
      type: NodeTypes.ELEMENT,
      __i18nWrapped: false,
      tagType: 3,
      props: [],
      children: [],
      tag: "template",
    } as never;

    transformer(wrapped, {} as never);
    transformer(slot, {} as never);
    transformer(template, {} as never);

    expect(transformComponentPropsMock).not.toHaveBeenCalled();
    expect(injectI18nDirectiveMock).not.toHaveBeenCalled();
  });

  it("injects component entries immediately for component usage sites and stops there", () => {
    transformComponentPropsMock.mockReturnValue([
      { id: "prop-1", key: "home.title", usageType: "prop" },
    ]);

    const transformer = createI18nTransformer(
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      "HelloWorld",
    );

    const element = {
      type: NodeTypes.ELEMENT,
      __i18nWrapped: false,
      tagType: 1,
      tag: "Button",
      props: [],
      children: [],
    } as never;

    transformer(element, {} as never);

    expect(transformComponentPropsMock).toHaveBeenCalled();
    expect(extractDeclaredKeysMock).not.toHaveBeenCalled();
    expect(extractInFileTranslationsMock).not.toHaveBeenCalled();
    expect(injectI18nDirectiveMock).toHaveBeenCalledWith(element, [
      { id: "prop-1", key: "home.title", usageType: "prop" },
    ]);
  });

  it("combines component, declared, and in-file entries before injecting the directive", () => {
    transformComponentPropsMock.mockReturnValue([
      { id: "prop-1", key: "home.title", usageType: "prop" },
    ]);
    extractDeclaredKeysMock.mockReturnValue([
      { id: "decl-1", key: "home.declared", usageType: "declared" },
    ]);
    extractInFileTranslationsMock.mockReturnValue([
      { id: "text-1", key: "home.text", usageType: "text" },
    ]);

    const transformer = createI18nTransformer(
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      "HelloWorld",
    );

    const element = {
      type: NodeTypes.ELEMENT,
      __i18nWrapped: false,
      tagType: 0,
      tag: "div",
      props: [],
      children: [],
    } as never;

    transformer(element, {} as never);

    expect(transformComponentPropsMock).toHaveBeenCalled();
    expect(extractDeclaredKeysMock).toHaveBeenCalledWith(element);
    expect(extractInFileTranslationsMock).toHaveBeenCalledWith(
      element,
      expect.any(Map),
      expect.any(Map),
    );
    expect(injectI18nDirectiveMock).toHaveBeenCalledWith(element, [
      { id: "prop-1", key: "home.title", usageType: "prop" },
      { id: "decl-1", key: "home.declared", usageType: "declared" },
      { id: "text-1", key: "home.text", usageType: "text" },
    ]);
  });
});
