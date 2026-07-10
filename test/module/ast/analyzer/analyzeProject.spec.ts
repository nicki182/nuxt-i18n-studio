import { analyzeProject } from "@ast/analyzer/analyzeProject";
import { beforeEach, describe, expect, it, vi } from "vitest";

const buildFileCacheMock = vi.hoisted(() => vi.fn());
const buildPropKeyMapMock = vi.hoisted(() => vi.fn());
const assignCandidateIdsMock = vi.hoisted(() => vi.fn());
const serializePropKeyMapMock = vi.hoisted(() => vi.fn());

vi.mock("@ast/analyzer/buildFileCache", () => ({
  buildFileCache: buildFileCacheMock,
}));

vi.mock("@ast/analyzer/assignCandidateIds", () => ({
  assignCandidateIds: assignCandidateIdsMock,
}));

vi.mock("@ast/analyzer/serializePropKeyMap", () => ({
  serializePropKeyMap: serializePropKeyMapMock,
}));

vi.mock("@ast/transformer", () => ({
  buildPropKeyMap: buildPropKeyMapMock,
}));

describe("analyzeProject", () => {
  beforeEach(() => {
    buildFileCacheMock.mockReset();
    buildPropKeyMapMock.mockReset();
    assignCandidateIdsMock.mockReset();
    serializePropKeyMapMock.mockReset();
  });

  it("builds a prop key map, assigns ids, and serializes the result", () => {
    const rawFiles = [
      { relativePath: "components/Button.vue", source: "<template />" },
    ];
    const propKeyMap = new Map([
      [
        "Button",
        new Map([
          [
            "title",
            {
              element: "h1",
              candidates: [{ id: "a" }, { id: "b" }],
            },
          ],
        ]),
      ],
    ]) as never;

    buildFileCacheMock.mockReturnValue([{ componentName: "Button" }]);
    buildPropKeyMapMock.mockReturnValue(propKeyMap);
    serializePropKeyMapMock.mockReturnValue({
      byComponentEnd: {},
      byComponentInitial: {},
    });

    const result = analyzeProject(rawFiles as never, ["components/Button.vue"]);

    expect(buildFileCacheMock).toHaveBeenCalledWith(rawFiles);
    expect(buildPropKeyMapMock).toHaveBeenCalledWith(
      [{ componentName: "Button" }],
      ["components/Button.vue"],
    );
    expect(assignCandidateIdsMock).toHaveBeenCalledWith(propKeyMap);
    expect(serializePropKeyMapMock).toHaveBeenCalledWith(propKeyMap);
    expect(result).toEqual({
      jsonReport: { byComponentEnd: {}, byComponentInitial: {} },
      metrics: {
        componentCount: 1,
        totalProps: 1,
        totalCandidates: 2,
      },
    });
  });
});
