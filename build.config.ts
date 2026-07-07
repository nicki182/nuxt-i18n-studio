import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineBuildConfig } from "unbuild";

function parseTsconfig() {
  const raw = readFileSync("./tsconfig.json", "utf8");
  const cleaned = raw
    .replace(/\/\/.*$/gm, "")
    .replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(cleaned);
}

function aliasFromTsconfig(): Record<string, string> {
  const paths: Record<string, string[]> = parseTsconfig()?.compilerOptions?.paths ?? {};

  return Object.fromEntries(
    Object.entries(paths).map(([key, [first]]) => {
      const alias = key.replace(/\/\*$/, "");
      const resolved = new URL(first!.replace(/\/\*$/, ""), import.meta.url);
      return [alias, fileURLToPath(resolved)];
    })
  );
}

export default defineBuildConfig({
  hooks: {
    "build:prepare"(ctx) {
      ctx.options.entries.push({ input: "./src/cli" });

      // Temporarily strip paths from tsconfig.json so loadTSCompilerOptions doesn't crash
      const tsconfig = parseTsconfig();
      const original = JSON.stringify(tsconfig, null, 2);
      delete tsconfig.compilerOptions?.paths;
      writeFileSync("./tsconfig.json", JSON.stringify(tsconfig, null, 2));

      // Restore after build
      process.on("exit", () => writeFileSync("./tsconfig.json", original));
    },
  },
  alias: aliasFromTsconfig(),
});
