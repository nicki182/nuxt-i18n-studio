import { defineNuxtModule, addPlugin, addServerHandler, createResolver, addComponent } from '@nuxt/kit'

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
    if (process.env.I18N_STUDIO_MODE !== 'true') return
    console.log('✅ i18n Studio active. Injecting devtools...')

    const resolver = createResolver(import.meta.url)

    nuxt.options.runtimeConfig.public.i18nStudio = {
      defaultLocale: options.defaultLocale,
      localesPath: options.localesPath
    }

    // --- AST TRANSFORM: THE AUTO-WRAPPER ---
    nuxt.options.vue = nuxt.options.vue || {}
    nuxt.options.vue.compilerOptions = nuxt.options.vue.compilerOptions || {}
    nuxt.options.vue.compilerOptions.nodeTransforms = nuxt.options.vue.compilerOptions.nodeTransforms || []

    nuxt.options.vue.compilerOptions.nodeTransforms.push((node: any) => {
      if (node.__i18nWrapped) return
      if (node.type !== 1 || !node.loc.source.includes('$t')) return

      const foundKeys: string[] = []
      for (const child of node.children) {
        if (child.type === 5) {
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

        const originalNode = { ...node, __i18nWrapped: true }

        node.tag = 'I18nEditable'
        node.tagType = 1

        node.props = [{
          type: 6,
          name: 'translation-key',
          value: { type: 2, content: uniqueKeys, loc: node.loc },
          loc: node.loc
        }]

        node.children = [originalNode]
      }
    })

    // --- REGISTRATIONS ---
    addComponent({
      name: 'I18nEditable',
      filePath: resolver.resolve('./runtime/components/I18nEditable.vue'),
      global: true
    })

    addPlugin(resolver.resolve('./runtime/client'))

    addServerHandler({
      route: '/api/__i18n_studio/update',
      handler: resolver.resolve('./runtime/server/api/__i18n_studio/update')
    })
  }
})
