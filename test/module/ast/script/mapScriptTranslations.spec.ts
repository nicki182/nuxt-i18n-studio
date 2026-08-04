import { mapScriptTranslations } from "@ast/script/mapScriptTranslations";
import { describe, expect, it } from "vitest";

describe("mapScriptTranslations", () => {
  it("collects translations from variable declarators, functions, and assignments", () => {
    const result = mapScriptTranslations(`
      const title = t("home.title");
      const subtitle = t("home.subtitle");

      function buildLabel() {
        return $t("home.label");
      }

      let message = "unused";
      message = t("home.message");
    `);

    expect(result.get("title")).toEqual([
      {
        type: "static",
        key: "home.title",
        id: "__STATIC__home.title",
      },
    ]);

    expect(result.get("subtitle")).toEqual([
      {
        type: "static",
        key: "home.subtitle",
        id: "__STATIC__home.subtitle",
      },
    ]);

    expect(result.get("buildLabel")).toEqual([
      {
        type: "static",
        key: "home.label",
        id: "__STATIC__home.label",
      },
    ]);

    expect(result.get("message")).toEqual([
      {
        type: "static",
        key: "home.message",
        id: "__STATIC__home.message",
      },
    ]);
  });

  it("returns an empty map for invalid script code", () => {
    expect(mapScriptTranslations("const title =")).toEqual(new Map());
  });
});
