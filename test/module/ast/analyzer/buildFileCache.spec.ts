import { buildFileCache } from "@ast/analyzer/buildFileCache";
import { beforeEach, describe, expect, it, vi } from "vitest";

const parseSfcMock = vi.hoisted(() => vi.fn());
const mapScriptStateMock = vi.hoisted(() => vi.fn());
const mapScriptTranslationsMock = vi.hoisted(() => vi.fn());

vi.mock("@ast/parseSfc", () => ({
  parseSfc: parseSfcMock,
}));

vi.mock("@ast/script", () => ({
  mapScriptState: mapScriptStateMock,
  mapScriptTranslations: mapScriptTranslationsMock,
}));

describe("buildFileCache", () => {
  beforeEach(() => {
    parseSfcMock.mockReset();
    mapScriptStateMock.mockReset();
    mapScriptTranslationsMock.mockReset();
  });

  it("builds cache entries from raw files and parses script/template content", () => {
    parseSfcMock.mockReturnValue({
      scriptContent: "const msg = 'hello'",
      templateContent: "<div>{{ msg }}</div>",
    });
    mapScriptStateMock.mockReturnValue(new Map([["msg", ["home.msg"]]]));
    mapScriptTranslationsMock.mockReturnValue(new Map([["msg", []]]));

    const rawFiles = [
      { relativePath: "components/Button.vue", source: "<template />" },
    ];

    const result = buildFileCache(rawFiles as never);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        componentName: "Button",
        filePath: "components/Button.vue",
        scriptContent: "const msg = 'hello'",
        templateContent: "<div>{{ msg }}</div>",
        scriptVariableMap: new Map([["msg", ["home.msg"]]]),
        templateVariableMap: new Map([["msg", []]]),
      }),
    );
    expect(parseSfcMock).toHaveBeenCalledWith("<template />");
    expect(mapScriptStateMock).toHaveBeenCalledWith("const msg = 'hello'");
    expect(mapScriptTranslationsMock).toHaveBeenCalledWith(
      "const msg = 'hello'",
    );
  });
});
