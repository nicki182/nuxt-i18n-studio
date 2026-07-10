import { KeyExtractionType } from "@ast/constants";
import { extractDeclaredKeys } from "@ast/transformer/extractDeclaredKeys";
import { NodeTypes } from "@vue/compiler-dom";
import { describe, expect, it } from "vitest";

describe("extractDeclaredKeys", () => {
  it("returns empty when no declared-keys attribute is present", () => {
    const el = {
      props: [],
    };

    expect(extractDeclaredKeys(el as never)).toEqual([]);
  });

  it("extracts translation keys from a comma-separated declared-keys attribute", () => {
    const el = {
      props: [
        {
          type: NodeTypes.ATTRIBUTE,
          name: "data-i18n-keys",
          value: {
            content: "home.title, home.subtitle,  home.third",
          },
        },
      ],
    };

    expect(extractDeclaredKeys(el as never)).toEqual([
      {
        type: KeyExtractionType.Static,
        key: "home.title",
        id: "__STATIC__home.title",
        usageType: "declared",
      },
      {
        type: KeyExtractionType.Static,
        key: "home.subtitle",
        id: "__STATIC__home.subtitle",
        usageType: "declared",
      },
      {
        type: KeyExtractionType.Static,
        key: "home.third",
        id: "__STATIC__home.third",
        usageType: "declared",
      },
    ]);
  });

  it("ignores empty entries and whitespace-only values", () => {
    const el = {
      props: [
        {
          type: NodeTypes.ATTRIBUTE,
          name: "data-i18n-keys",
          value: {
            content: "home.title, ,   , home.subtitle",
          },
        },
      ],
    };

    expect(extractDeclaredKeys(el as never)).toEqual([
      {
        type: KeyExtractionType.Static,
        key: "home.title",
        id: "__STATIC__home.title",
        usageType: "declared",
      },
      {
        type: KeyExtractionType.Static,
        key: "home.subtitle",
        id: "__STATIC__home.subtitle",
        usageType: "declared",
      },
    ]);
  });
});
