import { describe, it, expect } from "vitest";

import { mapScriptState } from "../../../../src/ast/script/mapScriptState";

// ── Helpers ───────────────────────────────────────────────────────────────────

const toPlain = (map: Map<string, string[]>) => Object.fromEntries(map);

// ── mapScriptState ────────────────────────────────────────────────────────────

describe("mapScriptState", () => {
  // ── Basics ──────────────────────────────────────────────────────────────────

  it("returns an empty map for empty script", () => {
    expect(toPlain(mapScriptState(""))).toEqual({});
  });

  it("returns an empty map for malformed code", () => {
    expect(toPlain(mapScriptState("const = }"))).toEqual({});
  });

  it("ignores non-string variables", () => {
    const result = mapScriptState(`
      const count = ref(0);
      const isAdmin = ref(false);
      const obj = reactive({ key: 'value' });
    `);
    expect(toPlain(result)).toEqual({});
  });

  // ── ref() declarations ───────────────────────────────────────────────────────

  it("maps a simple ref() string declaration", () => {
    const result = mapScriptState(`const key = ref('home.foo');`);
    expect(toPlain(result)).toEqual({ key: ["home.foo"] });
  });

  it("maps a reactive() string declaration", () => {
    const result = mapScriptState(`const key = reactive('home.foo');`);
    expect(toPlain(result)).toEqual({ key: ["home.foo"] });
  });

  // ── Plain string declarations ────────────────────────────────────────────────

  it("maps a plain string const", () => {
    const result = mapScriptState(`const key = 'home.foo';`);
    expect(toPlain(result)).toEqual({ key: ["home.foo"] });
  });

  // ── Assignments ──────────────────────────────────────────────────────────────

  it("collects ref .value assignments", () => {
    const result = mapScriptState(`
      const key = ref('home.first');
      key.value = 'home.second';
    `);
    expect(toPlain(result)).toEqual({ key: ["home.first", "home.second"] });
  });

  it("collects plain reassignments", () => {
    const result = mapScriptState(`
      let key = 'home.first';
      key = 'home.second';
    `);
    expect(toPlain(result)).toEqual({ key: ["home.first", "home.second"] });
  });

  it("does not duplicate values assigned multiple times", () => {
    const result = mapScriptState(`
      const key = ref('home.foo');
      key.value = 'home.foo';
    `);
    expect(toPlain(result)).toEqual({ key: ["home.foo"] });
  });

  // ── Arrow functions ──────────────────────────────────────────────────────────

  it("traces implicit arrow function return", () => {
    const result = mapScriptState(`const getKey = () => 'home.foo';`);
    expect(toPlain(result)).toEqual({ getKey: ["home.foo"] });
  });

  it("traces explicit arrow function return", () => {
    const result = mapScriptState(`
      const getKey = () => {
        return 'home.foo';
      };
    `);
    expect(toPlain(result)).toEqual({ getKey: ["home.foo"] });
  });

  it("traces multiple return paths in arrow function", () => {
    const result = mapScriptState(`
      const getKey = (isAdmin) => {
        if (isAdmin) return 'home.admin';
        return 'home.user';
      };
    `);
    expect(toPlain(result)).toEqual({ getKey: ["home.admin", "home.user"] });
  });

  it("traces ternary in implicit arrow return", () => {
    const result = mapScriptState(`
      const getKey = (isAdmin) => isAdmin ? 'home.admin' : 'home.user';
    `);
    expect(toPlain(result)).toEqual({ getKey: ["home.admin", "home.user"] });
  });

  // ── Named function declarations ───────────────────────────────────────────────

  it("traces named function declaration return", () => {
    const result = mapScriptState(`
      function getKey() {
        return 'home.foo';
      }
    `);
    expect(toPlain(result)).toEqual({ getKey: ["home.foo"] });
  });

  it("traces multiple returns in named function", () => {
    const result = mapScriptState(`
      function getKey(isAdmin) {
        if (isAdmin) return 'home.admin';
        return 'home.user';
      }
    `);
    expect(toPlain(result)).toEqual({ getKey: ["home.admin", "home.user"] });
  });

  // ── Ternary and logical in declarations ───────────────────────────────────────

  it("traces ternary in variable declaration", () => {
    const result = mapScriptState(`
      const key = isAdmin ? 'home.admin' : 'home.user';
    `);
    expect(toPlain(result)).toEqual({ key: ["home.admin", "home.user"] });
  });

  it("traces logical OR in variable declaration", () => {
    const result = mapScriptState(`
      const key = dynamicKey || 'home.fallback';
    `);
    expect(toPlain(result)).toEqual({ key: ["home.fallback"] });
  });

  // ── defineProps ───────────────────────────────────────────────────────────────

  it("marks object syntax props with __PROP__ sentinel", () => {
    const result = mapScriptState(`
      const props = defineProps({ titleKey: String, labelKey: String });
    `);
    expect(toPlain(result)).toEqual({
      titleKey: ["__PROP__"],
      labelKey: ["__PROP__"],
    });
  });

  it("marks array syntax props with __PROP__ sentinel", () => {
    const result = mapScriptState(`
      defineProps(['titleKey', 'labelKey']);
    `);
    expect(toPlain(result)).toEqual({
      titleKey: ["__PROP__"],
      labelKey: ["__PROP__"],
    });
  });

  // ── TypeScript syntax ─────────────────────────────────────────────────────────

  it("handles TypeScript generic refs", () => {
    const result = mapScriptState(`const key = ref<string>('home.foo');`);
    expect(toPlain(result)).toEqual({ key: ["home.foo"] });
  });

  it("handles TypeScript return type annotations", () => {
    const result = mapScriptState(`
      const getKey = (): string => 'home.foo';
    `);
    expect(toPlain(result)).toEqual({ getKey: ["home.foo"] });
  });

  it("handles TypeScript typed variable declarations", () => {
    const result = mapScriptState(`const key: string = 'home.foo';`);
    expect(toPlain(result)).toEqual({ key: ["home.foo"] });
  });

  it("handles defineProps generic syntax", () => {
    const result = mapScriptState(`
      defineProps<{ titleKey: string; labelKey: string }>();
    `);
    // Generic syntax has no runtime argument — results in empty map
    // TypeScript generic props can't be statically harvested without type analysis
    expect(toPlain(result)).toEqual({});
  });

  // ── Multiple variables ────────────────────────────────────────────────────────

  it("handles multiple variables in one script", () => {
    const result = mapScriptState(`
      const dynamicKey = ref('home.dynamic.first');
      const isAdmin = ref(false);
      const toggleDynamic = () => {
        dynamicKey.value = dynamicKey.value === 'home.dynamic.first'
          ? 'home.dynamic.second'
          : 'home.dynamic.first';
      };
      const getKey = () => 'home.dynamic.first';
    `);
    expect(toPlain(result)).toEqual({
      dynamicKey: ["home.dynamic.first", "home.dynamic.second"],
      getKey: ["home.dynamic.first"],
    });
  });
});
