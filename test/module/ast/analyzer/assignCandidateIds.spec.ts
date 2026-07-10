import { assignCandidateIds } from "@ast/analyzer/assignCandidateIds";
import { describe, expect, it, vi } from "vitest";

const generateCandidateIdMock = vi.hoisted(() => vi.fn());

vi.mock("@ast/helper", () => ({
  generateCandidateId: generateCandidateIdMock,
}));

describe("assignCandidateIds", () => {
  it("assigns generated ids to every candidate in the prop key map", () => {
    generateCandidateIdMock
      .mockReturnValueOnce("button__title__0")
      .mockReturnValueOnce("button__title__1");

    const propKeyMap = new Map([
      [
        "Button",
        new Map([
          [
            "title",
            {
              element: "h1",
              candidates: [{ id: "old-0" }, { id: "old-1" }],
            },
          ],
        ]),
      ],
    ]) as never;

    assignCandidateIds(propKeyMap);

    expect(generateCandidateIdMock).toHaveBeenCalledWith("Button", "title", 0);
    expect(generateCandidateIdMock).toHaveBeenCalledWith("Button", "title", 1);
    expect(propKeyMap.get("Button").get("title").candidates).toEqual([
      { id: "button__title__0" },
      { id: "button__title__1" },
    ]);
  });
});
