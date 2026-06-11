import { parse } from "@vue/compiler-sfc";
/**
 * Parses the raw .vue file source to extract the content of the <script> and <template> blocks.
 * We use @vue/compiler-sfc for robust parsing that handles edge cases like
 * multiple script blocks, script setup, and various template syntax. The
 * returned content is then used by other parts of the plugin to analyze and
 * transform the AST.
 * @param source The raw .vue file source code.
 * @returns An object containing the parsed content of the <script> and <template> blocks.
 *          - scriptContent: Parsed content from everything within <script>,
 *          - templateContent: Parsed content from everything within <template>
 */
export function parseSfc(source: string): {
  templateContent: string | null;
  scriptContent: string | null;
} {
  try {
    const { descriptor } = parse(source,{
      
    });

    return {
      scriptContent:
        descriptor.scriptSetup?.content ?? descriptor.script?.content ?? null,
      templateContent: descriptor.template?.content ?? null,
    };
  } catch {
    return { templateContent: null, scriptContent: null };
  }
}
