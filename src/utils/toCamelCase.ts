/**
 * Converts a string to camelCase format.
 * Handles kebab-case, snake_case, and already-camelCase inputs.
 * e.g. "image-alt-text" → "imageAltText", "btn_text1" → "btnText1"
 * @param s - The input string to convert to camelCase.
 * @returns A camelCase representation of the input string.
 */
export function toCamelCase(s: string): string {
  return s.replace(/[-_]+(.)/g, (_, c: string) => c.toUpperCase());
}
