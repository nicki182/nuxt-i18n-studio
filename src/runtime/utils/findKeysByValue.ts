/**
 * Recursively flattens a nested i18n message object and returns all keys
 * whose translated value matches the given string — including interpolated
 * messages where {placeholder} tokens are treated as wildcards.
 *
 * e.g. store value "{entity_name} FAQ" matches rendered text "Activist FAQ"
 */
export function findKeysByValue(
  messages: Record<string, unknown>,
  value: string,
  prefix = "",
): string[] {
  if (!value) return [];

  const results: string[] = [];
  const needle = value.trim();

  for (const [k, v] of Object.entries(messages)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;

    if (typeof v === "string") {
      if (matchesTranslation(v, needle)) {
        results.push(fullKey);
      }
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      // Vue-i18n compiled message proxy — unwrap .loc.source if present
      const asObj = v as Record<string, unknown>;
      if (
        "loc" in asObj &&
        typeof (asObj.loc as Record<string, unknown>)?.source === "string"
      ) {
        const source = (
          (asObj.loc as Record<string, unknown>).source as string
        ).trim();
        if (matchesTranslation(source, needle)) {
          results.push(fullKey);
        }
      } else {
        results.push(...findKeysByValue(asObj, needle, fullKey));
      }
    }
  }

  return results;
}

/**
 * Returns true if a translation template string matches a rendered value.
 * Handles both exact matches and interpolated messages like "{entity_name} FAQ".
 * Interpolation tokens — {name}, {{ name }}, %{name}, {0} — are treated as
 * wildcards so "Activist FAQ" matches "{entity_name} FAQ".
 */
function matchesTranslation(template: string, rendered: string): boolean {
  const t = template.trim();
  const r = rendered.trim();

  // Fast path — exact match
  if (t === r) return true;

  // Check if the template contains any interpolation tokens
  // Supports: {name}  {{ name }}  %{name}  {0}
  if (!/\{/.test(t)) return false;

  // Replace all interpolation patterns with a non-greedy wildcard
  const escaped = t
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // escape regex special chars
    .replace(/\\\{\\{[^}]*\\\}\\\}/g, ".+")  // {{ name }}
    .replace(/%\\\{[^}]*\\\}/g, ".+")         // %{name}
    .replace(/\\\{[^}]*\\\}/g, ".+");         // {name} or {0}

  try {
    return new RegExp(`^${escaped}$`).test(r);
  } catch {
    return false;
  }
}
