

import {  defineNuxtModule,
  addPlugin,
  addServerHandler,
  createResolver,
  useLogger,
} from "@nuxt/kit";

import { extractI18nArguments } from "./runtime/utils/extractI18nArguments";

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

    const logger = useLogger("@nicki182/nuxt-i18n-studio");
    logger.success("i18n Studio active. Injecting devtools...");

    const resolver = createResolver(import.meta.url);

    nuxt.options.runtimeConfig.public.i18nStudio = {
      localesPath: options.localesPath,
      isFlatJson: options.isFlatJson,
      cleanOnValueChange: options.cleanOnValueChange,
      githubRepo: options.githubRepo,
    };

    // ── VUE AST TRANSFORM (Hybrid Architecture) ───────────────
    nuxt.options.vue.compilerOptions.nodeTransforms =
      nuxt.options.vue.compilerOptions.nodeTransforms || [];
    nuxt.options.vue.compilerOptions.nodeTransforms.push((node: unknown) => {
      const el = node as ASTElement;

      if (el.type !== 1 || (el as any).__i18nWrapped) return;
      if (el.tagType === 2 || el.tagType === 3) return;
      if (!el.loc?.source?.includes("$t") && !el.loc?.source?.includes(" t("))
        return;

      if (!el.props || !Array.isArray(el.props)) el.props = [];

      const dynamicExpressions: { key: string; type: string }[] = [];

      // 1. Check inner text interpolations (e.g. {{ $t('key') }})
      el.children?.forEach((childNode) => {
        if (childNode.type === 5) {
          const child = childNode as ASTInterpolation;
          const expression = child.content?.content;
          if (expression) {
            extractI18nArguments(expression).forEach((key) => {
              dynamicExpressions.push({ key, type: "text:dynamic" });
            });
          }
        }
      });

      // 2. Check Vue attribute bindings (e.g. :placeholder="$t('key')")
      el.props?.forEach((propNode) => {
        if (propNode.type === 7) {
          const prop = propNode as ASTDirective;
          if (prop.name === "bind" && prop.exp?.content) {
            const attrName = prop.arg?.content;
            if (attrName) {
              extractI18nArguments(prop.exp.content).forEach((key) => {
                dynamicExpressions.push({ key, type: `attr:${attrName}` });
              });
            }
          }
        }
      });
      if (dynamicExpressions.length === 0) return;
      (el as any).__i18nWrapped = true;

      // Encode payload to Base64 to guarantee Vue compilation safety
      const payload = JSON.stringify(dynamicExpressions);
      const base64Payload = btoa(payload);
      const finalExpression = base64Payload;
      console.log("Attaching i18n usages to element:", dynamicExpressions);
      const locStub = {
        source: finalExpression,
        start: { offset: 0, line: 1, column: 1 },
        end: { offset: 0, line: 1, column: 1 },
      };

      el.props.push({
        type: 7,
        name: "i18n-studio",
        modifiers: [],
        exp: {
          type: 4,
          content: finalExpression,
          isStatic: true,
          isConstant: true,
          loc: locStub,
        },
        loc: locStub,
      } as any);
    });

    // ── REGISTRATIONS ───────────────────────────────────────
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
