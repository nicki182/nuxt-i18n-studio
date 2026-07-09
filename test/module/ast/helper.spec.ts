import type { PropCandidate, PropComponentJson } from "@ast/types";

import {
  buildFlatIndex,
  extractKeys,
  generateCandidateId,
  loadPropMap,
} from "@ast/helper";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";


describe("ast helper", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("generates candidate ids with a slugged component prefix and sanitized prop names", () => {
    expect(generateCandidateId("MyButton", "title", 2)).toBe("mb__title__2");
    expect(generateCandidateId("MyButton", "my-input", 1)).toBe("mb__my-input__1");
  });

  it("extracts direct keys and candidate keys from a translation expression", () => {
    const valueMap = new Map<string, string[]>([
      ["titleKey", ["home.title", "home.subtitle"]],
    ]);

    expect(extractKeys("$t(titleKey)", valueMap)).toEqual([
      "home.title",
      "home.subtitle",
    ]);
  });

  it("loads a prop map from disk into the provided indexes", () => {
    const dir = mkdtempSync(join(tmpdir(), "ast-helper-"));
    tempDirs.push(dir);

    const filePath = join(dir, "prop-map.json");
    const payload: PropComponentJson = {
      byComponentEnd: {
        Button: {
          title: {
            element: "h1",
            candidates: [
              {
                id: "button__title__0",
                key: "button.title",
                path: "src/components/Button.vue",
                componentInitial: "Button",
                componentEnd: "Button",
                propName: "title",
                element: "h1",
              },
            ],
          },
        },
      },
      byComponentInitial: {
        Button: {
          title: [
            {
              propId: "button__title__0",
              element: "h1",
              componentEnd: "Button",
            },
          ],
        },
      },
    };

    writeFileSync(filePath, JSON.stringify(payload), "utf-8");

    const propKeyMap = new Map<
      string,
      Map<string, { element: string; candidates: PropCandidate[] }>
    >();
    const componentInitialIndex = new Map<
      string,
      Map<string, Array<{ propId: string; element: string; componentEnd: string }>>
    >();
    const propIdIndex = new Map<string, unknown>();

    loadPropMap(filePath, {
      propKeyMap,
      componentInitialIndex,
      propIdIndex,
    });

    expect(propKeyMap.get("Button")?.get("title")).toEqual(
      expect.objectContaining({
        element: "h1",
        candidates: [
          expect.objectContaining({
            id: "button__title__0",
            key: "button.title",
          }),
        ],
      }),
    );

    expect(componentInitialIndex.get("Button")?.get("title")).toEqual([
      {
        propId: "button__title__0",
        element: "h1",
        componentEnd: "Button",
      },
    ]);

    expect(propIdIndex.get("button__title__0")).toEqual(
      payload.byComponentEnd.Button?.title?.candidates[0],
    );
  });

  it("builds a flat index object from the prop id map", () => {
    const index = new Map<string, unknown>([
      ["one", { key: "home.one" }],
      ["two", { key: "home.two" }],
    ]);

    expect(buildFlatIndex(index)).toBe(
      JSON.stringify({
        one: { key: "home.one" },
        two: { key: "home.two" },
      }),
    );
  });
});
