import { harvestFromFunctionDeclaration } from "@ast/script/harvest/harvestFromFunctionDeclaration";
import { describe, it, expect } from "vitest";

import { mockFunctionDeclaration, mockReturnStatement } from "../../mocks";

describe("harvestFromFunctionDeclaration", () => {
  it("harvests a single return value from a named function declaration", () => {
    const fn = mockFunctionDeclaration("getKey", [mockReturnStatement("home.foo")]);

    expect(harvestFromFunctionDeclaration(fn)).toEqual([
      { name: "getKey", value: "home.foo" },
    ]);
  });

  it("harvests multiple return values from a named function declaration", () => {
    const fn = mockFunctionDeclaration("getKey", [
      mockReturnStatement("home.admin"),
      mockReturnStatement("home.user"),
    ]);

    const result = harvestFromFunctionDeclaration(fn);
    expect(result).toContainEqual({ name: "getKey", value: "home.admin" });
    expect(result).toContainEqual({ name: "getKey", value: "home.user" });
  });

  it("returns undefined when the function declaration has no identifier", () => {
    const fn = mockFunctionDeclaration("getKey", [mockReturnStatement("home.foo")]);
    const fnWithoutId = { ...fn, id: null };

    expect(harvestFromFunctionDeclaration(fnWithoutId)).toBeUndefined();
  });
});
