import {
  defineNuxtModule,
  addPlugin,
  addServerHandler,
  createResolver,
  useLogger,
} from "@nuxt/kit";

const i18nRegex = /\$t\(\s*['"`]([^'"`]+)['"`]/g;

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

    // ── AST TRANSFORM ───────────────────────────────────────
    nuxt.options.vue = nuxt.options.vue || {};
    nuxt.options.vue.compilerOptions = nuxt.options.vue.compilerOptions || {};
    nuxt.options.vue.compilerOptions.nodeTransforms =
      nuxt.options.vue.compilerOptions.nodeTransforms || [];

    nuxt.options.vue.compilerOptions.nodeTransforms.push((node: unknown) => {
      // Safely cast to your ASTElement interface
      const el = node as ASTElement;

      // Type 1 = Element
      if (el.type !== 1 || el.__i18nWrapped) return;
      if (!el.loc?.source?.includes("$t")) return;

      const textKeys: string[] = [];
      const attrMappings: { attr: string; key: string }[] = [];

      el.children?.forEach((childNode) => {
        // Type 5 = Interpolation
        if (childNode.type === 5) {
          const child = childNode as ASTInterpolation;
          const expression =
            child.content?.content || child.content?.loc?.source;

          if (expression) {
            [...expression.matchAll(i18nRegex)].forEach((match) => {
              if (match[1]) textKeys.push(match[1]);
            });
          }
        }
      });

      el.props?.forEach((propNode) => {
        // Type 7 = Directive
        if (propNode.type === 7) {
          const prop = propNode as ASTDirective;
          if (prop.name === "bind" && prop.exp) {
            const expStr = prop.exp.loc?.source || prop.exp.content;
            const attrName = prop.arg?.content;

            if (expStr && attrName) {
              [...expStr.matchAll(i18nRegex)].forEach((match) => {
                if (match[1])
                  attrMappings.push({ attr: attrName, key: match[1] });
              });
            }
          }
        }
      });

      const allKeys = [
        ...new Set([...textKeys, ...attrMappings.map((m) => m.key)]),
      ];

      if (allKeys.length === 0) return;

      el.__i18nWrapped = true;

      // 1. Inject data-i18n-key (Type 6 = Attribute)
      el.props.push({
        type: 6,
        name: "data-i18n-key",
        value: { type: 2, content: allKeys.join(","), loc: el.loc },
        loc: el.loc,
      } as ASTAttribute);

      // 2. Inject data-i18n-attrs
      if (attrMappings.length > 0) {
        el.props.push({
          type: 6,
          name: "data-i18n-attrs",
          value: {
            type: 2,
            content: JSON.stringify(attrMappings),
            loc: el.loc,
          },
          loc: el.loc,
        } as ASTAttribute);
      }

      // 3. Inject our Custom Directive (v-i18n-studio) (Type 7 = Directive)
      el.props.push({
        type: 7,
        name: "i18n-studio",
        loc: el.loc,
      } as ASTDirective);
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
