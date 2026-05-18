/**
 * Deletes a key from a JSON object based on a dot-separated path string or a flat key, depending on the isFlat flag.
 * @param obj The original JSON object from which a key should be deleted.
 * @param pathStr A dot-separated string that specifies the path to the key that should be deleted (e.g., "a.b.c" for nested keys or "key" for flat keys).
 * @param isFlat A boolean flag indicating whether the JSON structure is flat (true) or nested (false). If true, the function will treat the pathStr as a single key rather than a path.
 * @returns A new JSON object with the specified key removed. If the key does not exist, the original object is returned unchanged.
 */
export function deleteJSONKey(obj: unknown, pathStr: string, isFlat = false) {
  const newObj = JSON.parse(JSON.stringify(obj)); // Deep clone

  if (isFlat) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete newObj[pathStr];
    return newObj;
  }

  const keys = pathStr.split(".");
  const lastKey = keys.pop()!;
  let current = newObj;

  for (const k of keys) {
    if (!current[k]) return newObj;
    current = current[k];
  }

  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete current[lastKey];

  return newObj;
}
