import { buildPropKeyMap } from "@ast/template/scanComponent/buildPropKeyMap";
import { beforeEach, describe, expect, it, vi } from "vitest";

const scanTemplateForInitialKeysMock = vi.hoisted(() => vi.fn());

vi.mock("@ast/template/scanComponent/scanTemplateForInitialKeys", () => ({
  scanTemplateForInitialKeys: scanTemplateForInitialKeysMock,
}));

describe("buildPropKeyMap", () => {
  beforeEach(() => {
    scanTemplateForInitialKeysMock.mockReset();
  });

  it("builds lookup maps and kicks off scanning for entry files", () => {
    const fileCache = [
      {
        componentName: "Button",
        filePath: "/src/Button.vue",
        templateContent: "<div />",
        scriptContent: "",
        scriptVariableMap: new Map(),
        templateVariableMap: new Map(),
      },
    ];

    const result = buildPropKeyMap(fileCache as never, ["/src/Button.vue"]);

    expect(scanTemplateForInitialKeysMock).toHaveBeenCalledWith(
      expect.anything(),
      fileCache[0],
      expect.objectContaining({
        propKeyMap: expect.any(Map),
        byFilePath: expect.any(Map),
        byComponentName: expect.any(Map),
        visited: expect.any(Set),
      }),
    );

    expect(result).toBeInstanceOf(Map);
  });
});
