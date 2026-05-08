// 🛠️ SMART HELPER: Handles both flat {"a.b":"val"} and nested {a: {b: "val"}}
/**
 *
 * @param json
 * @param key
 * @param newValue
 * @param isFlat
 */
export function updateJSON(
  json: Record<string, unknown>,
  key: string,
  newValue: string,
  isFlat?: boolean,
): Record<string, unknown> | undefined {
  const update = { ...json };

  // Case 1: It's a flat JSON file, and the exact key exists!
  if (key in update && isFlat) {
    update[key] = newValue;
    return update;
  }

  if (isFlat) {
    return undefined; // Can't update a non-existing key in flat mode
  }

  // Case 2: It's a nested JSON file
  const parts = key.split(".");
  const lastKey = parts.pop(); // Plucks off the last key securely

  if (!lastKey) {
    return update; // Fallback if key was somehow completely empty
  }

  let current = update;

  // Now we just iterate over whatever is left in the parts array
  for (const part of parts) {
    if (
      !(part in current) ||
      typeof current[part] !== "object" ||
      current[part] === null
    ) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  // Set the final value at the deepest level safely!
  current[lastKey] = newValue;

  return update;
}
