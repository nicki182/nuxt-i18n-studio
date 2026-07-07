/**
 *  Converts a string to PascalCase format.
 * @param s - The input string to convert to PascalCase.
 * @returns A PascalCase representation of the input string.
 */
export function toPascalCase(s: string): string {
  return s
    .replace(/[-_](.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (_, c: string) => c.toUpperCase());
}
