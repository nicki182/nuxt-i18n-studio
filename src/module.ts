import {
  defineNuxtModule,
  addPlugin,
  addServerHandler,
  addVitePlugin,
  createResolver,
  useLogger,
} from "@nuxt/kit";

import { ASTPlugin, createTemplateNodeTransform } from "./ast";

export default defineNuxtModule({
  meta: {
    name: "@nicki182/nuxt-i18n-studio",
    configKey: "i18nStudio",
  },
  defaults: {
    localesPath: "i18n/locales",
    isFlatJson: false,
    cleanOnValueChange: true,
    githubRepo: "",
  },
  moduleDependencies: {
    "nuxt-auth-utils": {
      version: "^0.5.29",
    },
  },

  setup(options, nuxt) {
    if (process.env.I18N_STUDIO_MODE !== "true") return;

    const log = useLogger("@nicki182/nuxt-i18n-studio");
    log.success("i18n Studio active. Injecting devtools...");

    const resolver = createResolver(import.meta.url);

    nuxt.options.runtimeConfig.public.i18nStudio = {
      localesPath: options.localesPath,
      isFlatJson: options.isFlatJson,
      cleanOnValueChange: options.cleanOnValueChange,
      githubRepo: options.githubRepo,
    };

    // ── VITE PLUGIN ────────────────────────────────────────────────────────────
    // Instantiate once so the valueMapCache is shared between the Vite plugin
    // and the nodeTransform that reads from it.
    const vitePlugin = ASTPlugin();
    addVitePlugin(vitePlugin);

    // ── NODE TRANSFORM ─────────────────────────────────────────────────────────
    // Reads per-file valueMap from the Vite plugin cache by context.filename.
    // Uses unshift so it runs before any other registered nodeTransforms.
    nuxt.options.vue.compilerOptions.nodeTransforms =
      nuxt.options.vue.compilerOptions.nodeTransforms || [];

    nuxt.options.vue.compilerOptions.nodeTransforms.unshift(
      createTemplateNodeTransform(vitePlugin),
    );

    // ── REGISTRATIONS ──────────────────────────────────────────────────────────
    nuxt.options.css.push(resolver.resolve("./runtime/assets/style.css"));

    addPlugin({
      src: resolver.resolve("./runtime/plugins/directive"),
      order: 1,
    });

    addPlugin({
      src: resolver.resolve("./runtime/plugins/client"),
      mode: "client",
      order: 2,
    });

    addPlugin({
      src: resolver.resolve("./runtime/plugins/freeze-timer"),
      mode: "client",
      order: 0,
    });

    addPlugin({
      src: resolver.resolve("./runtime/plugins/page-tracker-i18n"),
      mode: "client",
      order: 3,
    });

    addServerHandler({
      route: "/api/__i18n_studio/update",
      handler: resolver.resolve("./runtime/server/api/__i18n_studio/update"),
    });
    addServerHandler({
      route: "/api/__i18n_studio/auth/add_token",
      handler: resolver.resolve(
        "./runtime/server/api/__i18n_studio/auth/add_token",
      ),
    });
    addServerHandler({
      route: "/api/__i18n_studio/auth/verify_token",
      handler: resolver.resolve(
        "./runtime/server/api/__i18n_studio/auth/verify_token",
      ),
    });
    addServerHandler({
      route: "/api/__i18n_studio/auth/clear_token",
      handler: resolver.resolve(
        "./runtime/server/api/__i18n_studio/auth/clear_token",
      ),
    });
  },
});
