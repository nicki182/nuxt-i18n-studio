/**
 * Converts a string to a slug format.
 * @param s - The input string to convert to a slug.
 * @returns A slug representation of the input string.
 */
export function toSlug(s: string): string {
  const initials = s.match(/[A-Z]/g)?.join("").toLowerCase();
  return initials ?? s.toLowerCase().slice(0, 4);
}
