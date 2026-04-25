// @ts-check
import { createConfigForNuxt } from "@nuxt/eslint-config/flat"

import jsdoc from "eslint-plugin-jsdoc"
import perfectionist from "eslint-plugin-perfectionist"

// This is a config (not a plugin). It turns off ESLint rules that conflict with Prettier.
import eslintConfigPrettier from "eslint-config-prettier"

// Run `npx @eslint/config-inspector` to inspect the resolved config interactively
export default createConfigForNuxt({
  features: {
    // Rules for module authors
    tooling: true,
    // Nuxt stylistic rules (not "Prettier", but consistent style rules)
    stylistic: true
  },
  dirs: {
    // Nuxt ESLint will treat these as source dirs for module + playground
    src: ["./src", "./playground"]
  }
})
  .append({
    name: "i18n-text/ignores",
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.output/**",
      "**/.nuxt/**",
      "**/playwright-report/**"
    ]
  })
  .append({
    name: "i18n-text/plugins",
    plugins: {
      jsdoc,
      perfectionist
    },
    rules: {
      // --- General project rules ---
      "no-console": "error",

      // --- JSDoc (tune these to taste) ---
      // Start relatively light so it doesn't become annoying.
      "jsdoc/require-jsdoc": [
        "warn",
        {
          // Require docs only for exported APIs (good for libraries)
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: false,
            FunctionExpression: false
          },
          contexts: [
            // Require docs for exported functions/classes in TS/JS
            "ExportNamedDeclaration > FunctionDeclaration",
            "ExportNamedDeclaration > ClassDeclaration",
            "ExportDefaultDeclaration > FunctionDeclaration",
            "ExportDefaultDeclaration > ClassDeclaration"
          ]
        }
      ],
      "jsdoc/require-param": "warn",
      "jsdoc/require-returns": "off", // many TS functions are self-explanatory; turn on later if you want
      "jsdoc/require-description": "off",
      "jsdoc/check-tag-names": "error",
      "jsdoc/check-param-names": "error",
      "perfectionist/sort-imports": [
        "error",
        {
          type: "natural",
          order: "asc",
          // helpful defaults to reduce churn
          newlinesBetween: "always",
          groups: [
            "type",
            ["builtin", "external"],
            ["internal", "parent", "sibling", "index"],
            "side-effect",
            "object"
          ]
        }
      ],
    }
  })
  // Disable rules that conflict with Prettier (recommended if you use Prettier)
  .append(eslintConfigPrettier)
