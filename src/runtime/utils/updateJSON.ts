/**
 * Updates a JSON object by setting a new value at a specified key, which can be either a flat key or a nested key defined by a dot-separated path. The function creates a new object with the updated value, ensuring immutability of the original object. If the isFlat flag is true, the function treats the key as a single flat key; otherwise, it parses the key as a path to set the value in a nested structure.
 * @param json The original JSON object to be updated.
 * @param key The key or dot-separated path where the new value should be set.
 * @param newValue The new value to set at the specified key or path.
 * @param isFlat A boolean flag indicating whether the JSON structure is flat (true) or nested (false). If true, the function will treat the key as a single flat key rather than a path.
 * @returns A new JSON object with the updated value, or undefined if the update could not be performed in flat mode.
 */
export function updateJSON(
  json: Record<string, unknown>,
  key: string,
  newValue: string,
  isFlat?: boolean,
): Record<string, unknown> | undefined {
  const update = { ...json };

  if (key in update && isFlat) {
    update[key] = newValue;
    return update;
  }

  if (isFlat) {
    return undefined;
  }

  const parts = key.split(".");
  const lastKey = parts.pop();

  if (!lastKey) {
    return update;
  }

  let current = update;

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

  current[lastKey] = newValue;

  return update;
}
