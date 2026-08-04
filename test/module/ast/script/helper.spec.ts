import { isTCall } from "@ast/script/helper";
import { describe, expect, it } from "vitest";

describe("isTCall", () => {
  it("returns true for identifier calls to t or $t", () => {
    expect(
      isTCall({
        type: "CallExpression",
        callee: { type: "Identifier", name: "t" },
      } as never),
    ).toBe(true);

    expect(
      isTCall({
        type: "CallExpression",
        callee: { type: "Identifier", name: "$t" },
      } as never),
    ).toBe(true);
  });

  it("returns true for member calls to t or $t", () => {
    expect(
      isTCall({
        type: "CallExpression",
        callee: {
          type: "MemberExpression",
          computed: false,
          property: { type: "Identifier", name: "t" },
        },
      } as never),
    ).toBe(true);

    expect(
      isTCall({
        type: "CallExpression",
        callee: {
          type: "MemberExpression",
          computed: false,
          property: { type: "Identifier", name: "$t" },
        },
      } as never),
    ).toBe(true);
  });

  it("returns false for other calls or non-call nodes", () => {
    expect(
      isTCall({
        type: "CallExpression",
        callee: { type: "Identifier", name: "foo" },
      } as never),
    ).toBe(false);

    expect(
      isTCall({
        type: "Identifier",
        name: "t",
      } as never),
    ).toBe(false);
  });
});
