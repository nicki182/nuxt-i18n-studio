import {
  defineNuxtModule,
  addPlugin,
  addServerHandler,
  createResolver,
  addComponent,
} from "@nuxt/kit";

const i18nRegex = /\$t\(\s*['"`]([^'"`]+)['"`]/g;

export default defineNuxtModule({
  meta: {
    name: "@nicki182/nuxt-i18n-studio",
    configKey: "i18nStudio",
  },
  defaults: {
    defaultLocale: "en",
    localesPath: "i18n/locales",
  },
  setup(options, nuxt) {
    if (process.env.I18N_STUDIO_MODE !== "true") return;
    console.log("✅ i18n Studio active. Injecting devtools...");

    const resolver = createResolver(import.meta.url);

    nuxt.options.runtimeConfig.public.i18nStudio = {
      defaultLocale: options.defaultLocale,
      localesPath: options.localesPath,
    };


    // ── AST TRANSFORM (unchanged) ───────────────────────────
    nuxt.options.vue = nuxt.options.vue || {};
    nuxt.options.vue.compilerOptions = nuxt.options.vue.compilerOptions || {};
    nuxt.options.vue.compilerOptions.nodeTransforms =
      nuxt.options.vue.compilerOptions.nodeTransforms || [];

    nuxt.options.vue.compilerOptions.nodeTransforms.push((node: any) => {
      if (node.__i18nWrapped) return;
      if (node.type !== 1 || !node.loc.source.includes("$t")) return;

      const textKeys: string[] = [];
      node.children.forEach((child: any) => {
        if (child.type === 5) {
          const expression =
            child.content?.content || child.content?.loc?.source;
          if (expression) {
            [...expression.matchAll(i18nRegex)].forEach((match) => {
              if (match[1]) textKeys.push(match[1]);
            });
          }
        }
      });

      const attrMappings: { attr: string; key: string }[] = [];
      node.props?.forEach((prop: any) => {
        if (prop.type === 7 && prop.name === "bind" && prop.exp) {
          const expStr = prop.exp.loc?.source || prop.exp.content;
          if (!expStr) return;
          const attrName = prop.arg?.content;
          if (!attrName) return;
          [...expStr.matchAll(i18nRegex)].forEach((match) => {
            if (match[1]) attrMappings.push({ attr: attrName, key: match[1] });
          });
        }
      });

      const allKeys = [
        ...new Set([...textKeys, ...attrMappings.map((m) => m.key)]),
      ];
      if (allKeys.length === 0) return;

      const originalNode = { ...node, __i18nWrapped: true };
      node.tag = "I18nEditable";
      node.tagType = 1;

      const newProps: any[] = [
        {
          type: 6,
          name: "translation-key",
          value: { type: 2, content: allKeys.join(","), loc: node.loc },
          loc: node.loc,
        },
      ];

      if (attrMappings.length > 0) {
        newProps.push({
          type: 6,
          name: "translatable-attrs",
          value: {
            type: 2,
            content: JSON.stringify(attrMappings),
            loc: node.loc,
          },
          loc: node.loc,
        });
      }

      node.props = newProps;
      node.children = [originalNode];
    });

    // ── REGISTRATIONS ───────────────────────────────────────
    addComponent({
      name: "I18nEditable",
      filePath: resolver.resolve("./runtime/components/I18nEditable.vue"),
      global: true,
    });
    addPlugin({
      src: resolver.resolve("./runtime/plugins/client"),
      order: 1,
    });
    addPlugin({
      src: resolver.resolve("./runtime/plugins/freeze-timer"),
      mode: "client",
      order: 0, // runs before all other plugins
    });
    addServerHandler({
      route: "/api/__i18n_studio/update",
      handler: resolver.resolve("./runtime/server/api/__i18n_studio/update"),
    });
  },
});
