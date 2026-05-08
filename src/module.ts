import {
  defineNuxtModule,
  addPlugin,
  addServerHandler,
  createResolver,
  addComponent,
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

    if (process.env.DEV === "true" && !options.githubRepo) {
      logger.warn(
        "You are running in development mode without a GitHub repo configured. Changes will be written directly to disk. To enable GitHub PR flow, set the 'githubRepo' option to your repository URL.",
      );
    }

    // ── AST TRANSFORM ───────────────────────────────────────
    nuxt.options.vue = nuxt.options.vue || {};
    nuxt.options.vue.compilerOptions = nuxt.options.vue.compilerOptions || {};
    nuxt.options.vue.compilerOptions.nodeTransforms =
      nuxt.options.vue.compilerOptions.nodeTransforms || [];

    // Use 'unknown' for the incoming node, then safely cast it
    nuxt.options.vue.compilerOptions.nodeTransforms.push((node: unknown) => {
      const el = node as ASTElement;

      if (el.__i18nWrapped) return;
      if (el.type !== 1 || !el.loc?.source?.includes("$t")) return;

      const textKeys: string[] = [];

      el.children.forEach((child) => {
        if (child.type === 5) {
          const interp = child as ASTInterpolation;
          const expression =
            interp.content?.content || interp.content?.loc?.source;

          if (expression) {
            [...expression.matchAll(i18nRegex)].forEach((match) => {
              if (match[1]) textKeys.push(match[1]);
            });
          }
        }
      });

      const attrMappings: { attr: string; key: string }[] = [];

      el.props?.forEach((prop) => {
        if (prop.type === 7) {
          const dir = prop as ASTDirective;
          if (dir.name === "bind" && dir.exp) {
            const expStr = dir.exp.loc?.source || dir.exp.content;
            if (!expStr) return;

            const attrName = dir.arg?.content;
            if (!attrName) return;

            [...expStr.matchAll(i18nRegex)].forEach((match) => {
              if (match[1])
                attrMappings.push({ attr: attrName, key: match[1] });
            });
          }
        }
      });

      const allKeys = [
        ...new Set([...textKeys, ...attrMappings.map((m) => m.key)]),
      ];

      if (allKeys.length === 0) return;

      const originalNode = { ...el, __i18nWrapped: true };
      el.tag = "I18nEditable";
      el.tagType = 1;

      const newProps: ASTAttribute[] = [
        {
          type: 6,
          name: "translation-key",
          value: { type: 2, content: allKeys.join(","), loc: el.loc },
          loc: el.loc,
        },
      ];

      if (attrMappings.length > 0) {
        newProps.push({
          type: 6,
          name: "translatable-attrs",
          value: {
            type: 2,
            content: JSON.stringify(attrMappings),
            loc: el.loc,
          },
          loc: el.loc,
        });
      }

      el.props = newProps;
      el.children = [originalNode];
    });

    // ── REGISTRATIONS ───────────────────────────────────────
    addComponent({
      name: "I18nEditable",
      filePath: resolver.resolve("./runtime/components/I18nEditable.vue"),
      global: true,
    });
    addPlugin({
      src: resolver.resolve("./runtime/plugins/client"),
      mode: "client",
      order: 1,
    });
    addPlugin({
      src: resolver.resolve("./runtime/plugins/freeze-timer"),
      mode: "client",
      order: 0,
    });
    addServerHandler({
      route: "/api/__i18n_studio/update",
      handler: resolver.resolve("./runtime/server/api/__i18n_studio/update"),
    });
    addServerHandler({
      route: "/api/__i18n_studio/auth",
      handler: resolver.resolve("./runtime/server/api/__i18n_studio/auth"),
    });
    addServerHandler({
      route: "/api/__i18n_studio/verify_token",
      handler: resolver.resolve(
        "./runtime/server/api/__i18n_studio/verify_token",
      ),
    });
  },
});
