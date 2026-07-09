import { ASTPlugin } from "@ast/ASTPlugin";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("ASTPlugin", () => {

const parseSfcMock = vi.hoisted(() => vi.fn());
const mapScriptStateMock = vi.hoisted(() => vi.fn());
const mapScriptTranslationsMock = vi.hoisted(() => vi.fn());
const loadPropMapMock = vi.hoisted(() => vi.fn());
const buildFlatIndexMock = vi.hoisted(() => vi.fn());

vi.mock("@ast/parseSfc", () => ({
  parseSfc: parseSfcMock,
}));

vi.mock("@ast/script/mapScriptState", () => ({
  mapScriptState: mapScriptStateMock,
}));

vi.mock("@ast/script/mapScriptTranslations", () => ({
  mapScriptTranslations: mapScriptTranslationsMock,
}));

vi.mock("@ast/helper", () => ({
  buildFlatIndex: buildFlatIndexMock,
  loadPropMap: loadPropMapMock,
}));

  beforeEach(() => {
    parseSfcMock.mockReset();
    mapScriptStateMock.mockReset();
    mapScriptTranslationsMock.mockReset();
    loadPropMapMock.mockReset();
    buildFlatIndexMock.mockReset();
  });

  it("populates the caches during transform", () => {
    parseSfcMock.mockReturnValue({
      scriptContent: "const title = 'hello'",
      templateContent: "<div>{{ title }}</div>",
    });
    mapScriptStateMock.mockReturnValue(new Map([["title", ["home.title"]]]));
    mapScriptTranslationsMock.mockReturnValue(new Map([["title", []]]));

    const plugin = ASTPlugin() as ReturnType<typeof ASTPlugin>;

    plugin.transform("<template>...</template>", "/src/Hello.vue");

    expect(parseSfcMock).toHaveBeenCalledWith("<template>...</template>");
    expect(mapScriptStateMock).toHaveBeenCalledWith("const title = 'hello'");
    expect(mapScriptTranslationsMock).toHaveBeenCalledWith("const title = 'hello'");

    expect(plugin._valueMapCache.get("/src/Hello.vue")).toEqual(
      new Map([["title", ["home.title"]]]),
    );
    expect(plugin._templateMapCache.get("/src/Hello.vue")).toEqual(
      new Map([["title", []]]),
    );
  });

  it("removes cached entries on hot update and reloads prop maps", () => {
    const plugin = ASTPlugin() as ReturnType<typeof ASTPlugin>;
    const file = "/src/Hello.vue";

    plugin._valueMapCache.set(file, new Map());
    plugin._templateMapCache.set(file, new Map());

    plugin.handleHotUpdate({ file } as never);

    expect(plugin._valueMapCache.has(file)).toBe(false);
    expect(plugin._templateMapCache.has(file)).toBe(false);

    plugin.handleHotUpdate({ file: "/tmp/prop-map.json" } as never);

    expect(loadPropMapMock).toHaveBeenCalledWith("/tmp/prop-map.json", {
      propKeyMap: plugin._propKeyMap,
      componentInitialIndex: plugin._componentInitialIndex,
      propIdIndex: expect.any(Map),
    });
  });

  it("serves the prop map through the server middleware", () => {
    buildFlatIndexMock.mockReturnValue('{"button__title__0":{}}');

    const plugin = ASTPlugin() as ReturnType<typeof ASTPlugin>;
    const middlewares = { use: vi.fn() };
    const server = { middlewares };

    plugin.configureServer(server as never);

    const middleware = middlewares.use.mock.calls[0][1];
    const res = {
      setHeader: vi.fn(),
      end: vi.fn(),
    };

    middleware({}, res as never);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/json");
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(res.end).toHaveBeenCalledWith('{"button__title__0":{}}');
  });
});
