import { KeyExtractionType } from "@ast/constants";
import { extractScriptTranslations } from "@ast/script/extractScriptTranslations";
import { extractTemplateTranslations } from "@ast/template/extractTemplateTranslations";
import { extractInFileTranslations } from "@ast/transformer/extractInFileTranslations";
import { hasTemplateVariableRef } from "@ast/transformer/helper";
import { NodeTypes } from "@vue/compiler-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@ast/template/extractTemplateTranslations", () => ({
  extractTemplateTranslations: vi.fn(),
}));

vi.mock("@ast/script/extractScriptTranslations", () => ({
  extractScriptTranslations: vi.fn(),
}));

vi.mock("@ast/transformer/helper", () => ({
  hasTemplateVariableRef: vi.fn(),
}));

describe("extractInFileTranslations", () => {
  it("returns no entries when there are no translations or template refs", () => {
    vi.mocked(hasTemplateVariableRef).mockReturnValue(false);

    const el = {
      loc: { source: "<div>hello</div>" },
      children: [],
      props: [],
    };

    expect(
      extractInFileTranslations(el as never, new Map(), new Map()),
    ).toEqual([]);
  });

  it("extracts translations from interpolations when a t-call is present", () => {
    vi.mocked(hasTemplateVariableRef).mockReturnValue(false);

    vi.mocked(extractTemplateTranslations).mockReturnValue([
      {
        type: KeyExtractionType.Static,
        key: "home.title",
        id: "__STATIC__home.title",
      },
    ]);

    const el = {
      loc: { source: "<div>{{ $t('home.title') }}</div>" },
      children: [
        {
          type: NodeTypes.INTERPOLATION,
          content: {
            loc: { source: "$t('home.title')" },
          },
        },
      ],
      props: [],
    };

    const result = extractInFileTranslations(el as never, new Map(), new Map());

    expect(result).toEqual([
      {
        type: KeyExtractionType.Static,
        key: "home.title",
        id: "__STATIC__home.title",
        usageType: "text:dynamic",
      },
    ]);
  });

  it("extracts translations from bound attributes when a t-call is present", () => {
    vi.mocked(hasTemplateVariableRef).mockReturnValue(false);

    vi.mocked(extractTemplateTranslations).mockReturnValue([
      {
        type: KeyExtractionType.Static,
        key: "home.subtitle",
        id: "__STATIC__home.subtitle",
      },
    ]);

    const el = {
      loc: { source: "<div :title=\"$t('home.subtitle')\"></div>" },
      children: [],
      props: [
        {
          type: NodeTypes.DIRECTIVE,
          name: "bind",
          arg: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: "title",
          },
          exp: {
            loc: { source: "$t('home.subtitle')" },
          },
        },
      ],
    };

    const result = extractInFileTranslations(el as never, new Map(), new Map());

    expect(result).toEqual([
      {
        type: KeyExtractionType.Static,
        key: "home.subtitle",
        id: "__STATIC__home.subtitle",
        usageType: "attr:title",
      },
    ]);
  });

  it("extracts script translations for bare identifiers in bound attributes", () => {
    vi.mocked(hasTemplateVariableRef).mockReturnValue(true);

    vi.mocked(extractTemplateTranslations).mockReturnValue([]);
    vi.mocked(extractScriptTranslations).mockReturnValue([
      {
        type: KeyExtractionType.Static,
        key: "home.script",
        id: "__STATIC__home.script",
      },
    ]);

    const el = {
      loc: { source: '<div :title="label"></div>' },
      children: [],
      props: [
        {
          type: NodeTypes.DIRECTIVE,
          name: "bind",
          arg: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: "title",
          },
          exp: {
            loc: { source: "label" },
          },
        },
      ],
    };

    const result = extractInFileTranslations(el as never, new Map(), new Map());

    expect(result).toEqual([
      {
        type: KeyExtractionType.Static,
        key: "home.script",
        id: "__STATIC__home.script",
        usageType: "attr:title",
        scriptRef: "label",
      },
    ]);
  });

  it("extracts translations from template variable references when present", () => {
    vi.mocked(hasTemplateVariableRef).mockReturnValue(true);

    const el = {
      loc: { source: "<div>{{ message }}</div>" },
      children: [
        {
          type: NodeTypes.INTERPOLATION,
          content: {
            loc: { source: "message" },
          },
        },
      ],
      props: [],
    };

    const result = extractInFileTranslations(el as never, new Map(), new Map());

    expect(result).toEqual([]);
  });
});
