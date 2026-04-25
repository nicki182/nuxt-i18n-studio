import { defineNuxtModule, addPlugin, addServerHandler, createResolver } from '@nuxt/kit'

const i18nRegex = /\$t\(\s*['"`]([^'"`]+)['"`]/g

export default defineNuxtModule({
  meta: {
    name: '@nicki182/nuxt-i18n-studio',
    configKey: 'i18nStudio'
  },
  defaults: {
    defaultLocale: 'en',
    localesPath: 'i18n/locales'
  },
  setup(options, nuxt) {
    // 🛑 THE GATEKEEPER: Only run if the CLI started the app!
    if (process.env.I18N_STUDIO_MODE !== 'true') {
      return
    }

    console.log('✅ i18n Studio active. Injecting devtools...')

    const resolver = createResolver(import.meta.url)

    // 1. The AST Transform
    nuxt.options.vue = nuxt.options.vue || {}
    nuxt.options.vue.compilerOptions = nuxt.options.vue.compilerOptions || {}
    nuxt.options.vue.compilerOptions.nodeTransforms = nuxt.options.vue.compilerOptions.nodeTransforms || []
    // --- NEW: Inject options into Runtime Config ---
    nuxt.options.runtimeConfig.public.i18nStudio = {
      defaultLocale: options.defaultLocale,
      localesPath: options.localesPath
    }
    nuxt.options.vue.compilerOptions.nodeTransforms.push((node) => {
      if (!node.loc.source.includes('$t')) return
      if (node.type === 1) {
        const foundKeys: string[] = []
        for (const child of node.children) {
          if (child.type === 5) {
            // @ts-ignore
            const expression = child.content?.content || child.content?.loc?.source
            if (expression) {
              const matches = [...expression.matchAll(i18nRegex)]
              for (const match of matches) {
                if (match[1]) foundKeys.push(match[1])
              }
            }
          }
        }
        if (foundKeys.length > 0) {
          const uniqueKeys = [...new Set(foundKeys)].join(',')
          node.props.push({
            type: 6, name: 'data-i18n-key',
            value: { type: 2, content: uniqueKeys, loc: node.loc },
            loc: node.loc
          })
        }
      }
    })

    // 2. Inject the Client UI Plugin
    addPlugin(resolver.resolve('./runtime/client'))

    // 3. Inject the API Route
     addServerHandler({
      route: '/api/__i18n_studio/update',
      handler: resolver.resolve('./runtime/server/api/__i18n_studio/update')
    })
  }
})
