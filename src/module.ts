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

    // ── VITE PLUGIN ───────────────────────────────────────────────────────
    const vitePlugin = ASTPlugin();
    addVitePlugin(vitePlugin);

    // ── NODE TRANSFORM ────────────────────────────────────────────────────
    nuxt.options.vue.compilerOptions.nodeTransforms =
      nuxt.options.vue.compilerOptions.nodeTransforms || [];

    nuxt.options.vue.compilerOptions.nodeTransforms.unshift(
      createTemplateNodeTransform(vitePlugin),
    );

    // ── REGISTRATIONS ─────────────────────────────────────────────────────
    nuxt.options.css.push(resolver.resolve("./runtime/assets/style.css"));

    // i18n-click replaces the old directive plugin — one document listener,
    // reads data-i18n-keys attribute injected by the AST at build time
    addPlugin({
      src: resolver.resolve("./runtime/plugins/propMap"),
      mode: "client",
      order: 0, // load before directive plugin so resolveById is available
    });

    addPlugin({
      src: resolver.resolve("./runtime/plugins/directive"),
      mode: "client",
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
