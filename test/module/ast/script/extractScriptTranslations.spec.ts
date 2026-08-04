import { KeyExtractionType } from "@ast/constants";
import { extractScriptTranslations } from "@ast/script/extractScriptTranslations";
import { describe, expect, it } from "vitest";

describe("extractScriptTranslations", () => {
  it("maps direct calls to static extracted keys", () => {
    const templateVariableMap = new Map([
      ["title", [{ type: "direct", key: "home.title", id: "one" } as never]],
    ]) as never;

    expect(extractScriptTranslations("title", templateVariableMap)).toEqual([
      {
        type: KeyExtractionType.Static,
        key: "home.title",
        id: "__STATIC__home.title",
      },
    ]);
  });

  it("maps prefix calls to prefix extracted keys", () => {
    const templateVariableMap = new Map([
      ["label", [{ type: "prefix", prefix: "home.", id: "two" } as never]],
    ]) as never;

    expect(extractScriptTranslations("label", templateVariableMap)).toEqual([
      {
        type: KeyExtractionType.Prefix,
        prefix: "home.",
        id: "__PREFIX__home.",
      },
    ]);
  });

  it("maps dynamic calls to dynamic extracted keys and deduplicates by id", () => {
    const templateVariableMap = new Map([
      [
        "status",
        [
          {
            type: "dynamic",
            expr: "statusCode",
            candidates: [],
            id: "three",
          } as never,
          {
            type: "dynamic",
            expr: "statusCode",
            candidates: [],
            id: "three",
          } as never,
        ],
      ],
    ]) as never;

    expect(extractScriptTranslations("status", templateVariableMap)).toEqual([
      {
        type: KeyExtractionType.Dynamic,
        expr: "statusCode",
        candidates: [],
        id: "__EXPR__statusCode",
      },
    ]);
  });

  it("returns an empty array when no translations are available", () => {
    expect(extractScriptTranslations("missing", new Map() as never)).toEqual(
      [],
    );
  });
});
