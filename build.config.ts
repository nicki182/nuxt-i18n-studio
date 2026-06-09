// build.config.ts
import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  // We tap into unbuild's preparation hook.
  // This lets us safely inject our CLI script on top of Nuxt's default entrypoints.
  hooks: {
    "build:prepare"(ctx) {
      ctx.options.entries.push({ input: "./src/cli" });
    },
  },
});
