import { scanTemplateForInitialKeys } from "@ast/template/scanComponent/scanTemplateForInitialKeys";
import { NodeTypes } from "@vue/compiler-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { extractKeysMock, visitPropChainMock, parseMock } = vi.hoisted(() => ({
  extractKeysMock: vi.fn(),
  visitPropChainMock: vi.fn(),
  parseMock: vi.fn(),
}));

vi.mock("@ast/helper", () => ({
  extractKeys: extractKeysMock,
}));

vi.mock("@ast/template/scanComponent/visitPropChains", () => ({
  visitPropChain: visitPropChainMock,
}));

vi.mock("@vue/compiler-dom", async () => {
  const actual =
    await vi.importActual<typeof import("@vue/compiler-dom")>(
      "@vue/compiler-dom",
    );

  return {
    ...actual,
    parse: parseMock,
  };
});

describe("scanTemplateForInitialKeys", () => {
  beforeEach(() => {
    extractKeysMock.mockReset();
    visitPropChainMock.mockReset();
    parseMock.mockReset();
  });

  it("extracts keys from bound props and visits each prop chain", () => {
    const fileEntry = {
      componentName: "Parent",
      filePath: "/src/Parent.vue",
      scriptContent: "const title = props.title",
      scriptVariableMap: new Map(),
      templateContent: '<Child :title="foo" />',
      templateVariableMap: new Map(),
    };

    const node = {
      type: NodeTypes.ELEMENT,
      tag: "Child",
      tagType: 1,
      props: [
        {
          type: NodeTypes.DIRECTIVE,
          name: "bind",
          arg: { content: "title" },
          exp: { loc: { source: "$t('home.title')" } },
        },
      ],
      children: [],
    };

    extractKeysMock.mockReturnValue(["home.title", "home.subtitle"]);

    const ctx = {
      propKeyMap: new Map(),
      byFilePath: new Map(),
      byComponentName: new Map(),
      visited: new Set(),
    } as never;

    scanTemplateForInitialKeys(node as never, fileEntry as never, ctx as never);

    expect(extractKeysMock).toHaveBeenCalledWith(
      "$t('home.title')",
      fileEntry.scriptVariableMap,
    );
    expect(visitPropChainMock).toHaveBeenCalledTimes(2);
    expect(visitPropChainMock).toHaveBeenNthCalledWith(
      1,
      ctx,
      expect.objectContaining({
        key: "home.title",
        componentInitial: "Child",
        componentName: "Child",
        propName: "title",
      }),
    );
    expect(visitPropChainMock).toHaveBeenNthCalledWith(
      2,
      ctx,
      expect.objectContaining({
        key: "home.subtitle",
        componentInitial: "Child",
        componentName: "Child",
        propName: "title",
      }),
    );
  });

  it("recurses into child component templates using the PascalCase component name", () => {
    const fileEntry = {
      componentName: "Parent",
      filePath: "/src/Parent.vue",
      scriptContent: "",
      scriptVariableMap: new Map(),
      templateContent: "<Child />",
      templateVariableMap: new Map(),
    };

    const childEntry = {
      componentName: "Child",
      filePath: "/src/Child.vue",
      scriptContent: "",
      scriptVariableMap: new Map(),
      templateContent: "<div />",
      templateVariableMap: new Map(),
    };

    const node = {
      type: NodeTypes.ELEMENT,
      tag: "Child",
      tagType: 1,
      props: [],
      children: [],
    };

    parseMock.mockReturnValue({
      type: NodeTypes.ELEMENT,
      tag: "div",
      tagType: 0,
      props: [],
      children: [],
    });

    const ctx = {
      propKeyMap: new Map(),
      byFilePath: new Map(),
      byComponentName: new Map([["Child", childEntry]]),
      visited: new Set(),
    } as never;

    scanTemplateForInitialKeys(node as never, fileEntry as never, ctx as never);

    expect(parseMock).toHaveBeenCalledWith("<div />");
    expect(ctx.visited.has("__comp__Child")).toBe(true);
  });
});
