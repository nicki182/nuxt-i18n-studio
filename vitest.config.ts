import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@utils",
        replacement: fileURLToPath(new URL("./src/utils/index.ts", import.meta.url)),
      },
      {
        find: /^@ast\/(.*)$/,
        replacement: fileURLToPath(new URL("./src/ast/$1", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["test/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
