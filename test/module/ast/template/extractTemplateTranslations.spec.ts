import { describe, it, expect } from "vitest";

import type { ScriptVariableMap } from "../../../../src/ast/types";

import { extractTemplateTranslations } from "../../../../src/ast/template/extractTemplateTranslations";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMap(entries: Record<string, string[]>): ScriptVariableMap {
  return new Map(Object.entries(entries));
}

function keys(results: ReturnType<typeof extractTemplateTranslations>) {
  return results
    .filter((r): r is Extract<typeof r, { key: string }> => "key" in r)
    .map((r) => r.key);
}

function types(results: ReturnType<typeof extractTemplateTranslations>) {
  return results.map((r) => r.type);
}

// ── extractTemplateTranslations ───────────────────────────────────────────────

describe("extractTemplateTranslations", () => {
  // ── Basics ──────────────────────────────────────────────────────────────────

  it("returns empty array for expression with no $t call", () => {
    expect(extractTemplateTranslations("someVariable")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(extractTemplateTranslations("")).toEqual([]);
  });

  it("returns empty array for malformed expression", () => {
    expect(extractTemplateTranslations("{ broken ===")).toEqual([]);
  });

  // ── Static literals ──────────────────────────────────────────────────────────

  it("extracts a simple $t() call", () => {
    const result = extractTemplateTranslations(`$t('home.title')`);
    expect(keys(result)).toEqual(["home.title"]);
    expect(types(result)).toEqual(["static"]);
  });

  it("extracts using t() without dollar sign", () => {
    const result = extractTemplateTranslations(`t('home.title')`);
    expect(keys(result)).toEqual(["home.title"]);
  });

  it("extracts $t() with interpolation options (second arg ignored)", () => {
    const result = extractTemplateTranslations(
      `$t('home.description', { name: 'Nick' })`,
    );
    expect(keys(result)).toEqual(["home.description"]);
  });

  it("deduplicates identical keys", () => {
    const result = extractTemplateTranslations(`$t('home.title')`);
    const staticResults = result.filter((r) => r.type === "static");
    expect(staticResults).toHaveLength(1);
  });

  // ── Dynamic keys ─────────────────────────────────────────────────────────────

  it("extracts dynamic key as traced when in map", () => {
    const map = makeMap({ dynamicKey: ["home.first", "home.second"] });
    const result = extractTemplateTranslations(`$t(dynamicKey)`, map);

    expect(result).toContainEqual(
      expect.objectContaining({ type: "traced", key: "home.first" }),
    );
    expect(result).toContainEqual(
      expect.objectContaining({ type: "static", key: "home.first" }),
    );
    expect(result).toContainEqual(
      expect.objectContaining({ type: "static", key: "home.second" }),
    );
  });

  it("extracts dynamic key as dynamic when not in map", () => {
    const result = extractTemplateTranslations(`$t(dynamicKey)`);
    expect(result).toContainEqual(
      expect.objectContaining({ type: "dynamic", expr: "dynamicKey" }),
    );
  });

  // ── Ternary ───────────────────────────────────────────────────────────────────

  it("extracts both branches of a ternary", () => {
    const result = extractTemplateTranslations(
      `$t(isAdmin ? 'home.role.admin' : 'home.role.user')`,
    );
    expect(keys(result)).toContain("home.role.admin");
    expect(keys(result)).toContain("home.role.user");
  });

  // ── Function calls ────────────────────────────────────────────────────────────

  it("extracts getKey() when function is in map", () => {
    const map = makeMap({ getKey: ["home.dynamic.first"] });
    const result = extractTemplateTranslations(`$t(getKey())`, map);
    expect(keys(result)).toContain("home.dynamic.first");
  });

  it("extracts getKey() as dynamic when not in map", () => {
    const result = extractTemplateTranslations(`$t(getKey())`);
    expect(result).toContainEqual(expect.objectContaining({ type: "dynamic" }));
  });

  // ── Template literals ─────────────────────────────────────────────────────────

  it("extracts static template literal key", () => {
    const result = extractTemplateTranslations("$t(`home.title`)");
    expect(keys(result)).toEqual(["home.title"]);
  });

  it("extracts dynamic template literal as prefix", () => {
    const result = extractTemplateTranslations("$t(`errors.${code}`)");
    expect(result).toContainEqual(
      expect.objectContaining({ type: "prefix", prefix: "errors." }),
    );
  });

  // ── Props ─────────────────────────────────────────────────────────────────────

  it("extracts prop key as prop type", () => {
    const map = makeMap({ titleKey: ["__PROP__"] });
    const result = extractTemplateTranslations(`$t(titleKey)`, map);
    expect(result).toContainEqual(
      expect.objectContaining({ type: "prop", propName: "titleKey" }),
    );
  });

  // ── Array join ────────────────────────────────────────────────────────────────

  it("extracts array join as static key", () => {
    const result = extractTemplateTranslations(
      `$t(['home', 'title'].join('.'))`,
    );
    expect(keys(result)).toContain("home.title");
  });

  // ── Deduplication ─────────────────────────────────────────────────────────────

  it("deduplicates traced + static entries with same key", () => {
    const map = makeMap({ dynamicKey: ["home.foo"] });
    const result = extractTemplateTranslations(`$t(dynamicKey)`, map);

    // Each unique id should appear only once
    const ids = result.map((r) => r.id);
    expect(ids).toHaveLength(new Set(ids).size);
  });

  // ── Non-$t calls not extracted ────────────────────────────────────────────────

  it("does not extract keys from non-t function calls", () => {
    const result = extractTemplateTranslations(`someOtherFn('home.title')`);
    expect(result).toEqual([]);
  });

  it("does not confuse computed property access with $t", () => {
    const result = extractTemplateTranslations(`obj.title`);
    expect(result).toEqual([]);
  });
});
