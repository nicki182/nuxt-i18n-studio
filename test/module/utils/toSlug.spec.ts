import { toSlug } from "@utils";
import { describe, expect, it } from "vitest";

describe("toSlug", () => {
  it("returns the initials of uppercase words in lowercase", () => {
    expect(toSlug("MyButton")).toBe("mb");
  });

  it("falls back to the first four lowercase characters", () => {
    expect(toSlug("hello")).toBe("hell");
  });

  it("returns the uppercase initials for camelCase input", () => {
    expect(toSlug("helloWorld")).toBe("w");
  });
});
