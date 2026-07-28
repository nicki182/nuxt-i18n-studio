import { toPascalCase } from "@utils";
import { describe, expect, it } from "vitest";

describe("toPascalCase", () => {
  it("converts kebab-case to PascalCase", () => {
    expect(toPascalCase("my-component")).toBe("MyComponent");
  });

  it("converts snake_case to PascalCase", () => {
    expect(toPascalCase("my_component")).toBe("MyComponent");
  });

  it("capitalizes the first character when no separator is present", () => {
    expect(toPascalCase("myComponent")).toBe("MyComponent");
  });
});
