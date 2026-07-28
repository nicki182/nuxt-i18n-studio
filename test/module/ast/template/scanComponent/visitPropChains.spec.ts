import { visitPropChain } from "@ast/template/scanComponent/visitPropChains";
import { beforeEach, describe, expect, it, vi } from "vitest";

const buildPropRefsMock = vi.hoisted(() => vi.fn());
const tracePropUsageMock = vi.hoisted(() => vi.fn());

vi.mock("@ast/template/scanComponent/buildPropRefs", () => ({
  buildPropRefs: buildPropRefsMock,
}));

vi.mock("@ast/template/scanComponent/tracePropUsage", () => ({
  tracePropUsage: tracePropUsageMock,
}));

describe("visitPropChain", () => {
  beforeEach(() => {
    buildPropRefsMock.mockReset();
    tracePropUsageMock.mockReset();
  });

  it("builds prop refs and traces usage for the matching component entry", () => {
    const ctx = {
      propKeyMap: new Map(),
      byComponentName: new Map([
        [
          "Button",
          {
            templateContent: "<div />",
            scriptContent: "const label = props.title;",
            scriptVariableMap: new Map(),
            filePath: "/src/Button.vue",
          },
        ],
      ]),
      visited: new Set(),
    } as never;

    buildPropRefsMock.mockReturnValue(new Set(["title", "label"]));

    visitPropChain(ctx, {
      componentName: "Button",
      propName: "title",
      key: "home.title",
      sourcePath: "/src/Button.vue",
      componentInitial: "Button",
      componentEnd: "Button",
    } as never);

    expect(buildPropRefsMock).toHaveBeenCalledWith(
      "title",
      new Map(),
      "const label = props.title;",
    );
    expect(tracePropUsageMock).toHaveBeenCalledWith(
      expect.anything(),
      new Set(["title", "label"]),
      expect.objectContaining({ componentName: "Button", propName: "title" }),
      ctx,
    );
  });
});
