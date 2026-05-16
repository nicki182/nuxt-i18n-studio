// ── SFC Parser ────────────────────────────────────────────────────────────────
// Splits a raw .vue file into its template and script content using
// @vue/compiler-dom — the same parser Vite/Nuxt uses internally.
import type { ElementNode } from "@vue/compiler-dom";

import { parse as vueParse, NodeTypes } from "@vue/compiler-dom";

export function parseSfc(source: string): {
  templateContent: string | null;
  scriptContent: string | null;
} {
  let templateContent: string | null = null;
  let scriptContent: string | null = null;

  try {
    const root = vueParse(source, { parseMode: "sfc" });

    for (const child of root.children) {
      if (child.type !== NodeTypes.ELEMENT) continue;

      const el = child as ElementNode;

      if (el.tag === "template" && !templateContent) {
        templateContent = el.children?.[0]?.loc?.source ?? null;
        // Fallback: slice from loc offsets if inner node isn't available
        if (!templateContent && el.loc) {
          const inner = source.slice(
            el.loc.start.offset + el.loc.source.indexOf(">") + 1,
            el.loc.end.offset - "</template>".length
          );
          templateContent = inner || null;
        }
      }

      if (el.tag === "script" && !scriptContent) {
        // First text child of <script> or <script setup> is the raw JS/TS
        const textChild = el.children?.[0];
        scriptContent =
          textChild && "content" in textChild ? textChild.content : null;
      }
    }
  } catch {
    // Non-fatal — return nulls, plugin degrades gracefully
  }

  return { templateContent, scriptContent };
}
