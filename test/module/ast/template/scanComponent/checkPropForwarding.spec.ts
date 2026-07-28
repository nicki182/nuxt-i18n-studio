import { checkPropForwarding } from "@ast/template/scanComponent/checkPropForwarding";
import { beforeEach, describe, expect, it, vi } from "vitest";

const visitPropChainMock = vi.hoisted(() => vi.fn());

vi.mock("@ast/template/scanComponent/visitPropChains", () => ({
  visitPropChain: visitPropChainMock,
}));

describe("checkPropForwarding", () => {
  beforeEach(() => {
    visitPropChainMock.mockReset();
  });

  it("forwards a matching prop binding to the child component chain", () => {
    checkPropForwarding(
      {
        tag: "my-child",
        props: [
          {
            type: "Directive",
            name: "bind",
            arg: { content: "title" },
            exp: { loc: { source: "message" } },
          },
        ],
      } as never,
      new Set(["message"]),
      {
        componentName: "Button",
        sourcePath: "/src/Button.vue",
        componentInitial: "Button",
        componentEnd: "Button",
        propName: "title",
        key: "home.title",
      } as never,
      { propKeyMap: new Map() } as never,
    );

    expect(visitPropChainMock).toHaveBeenCalledWith(
      { propKeyMap: new Map() },
      expect.objectContaining({
        componentName: "MyChild",
        propName: "title",
        key: "home.title",
      }),
    );
  });
});
