// playground/nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    "../src/module", // Your actual module
    "@nuxtjs/i18n", // The real i18n module
  ],
  i18n: {
    locales: [{ code: "en", language: "en-US", file: "en.json" }],
    defaultLocale: "en",
  },
});
