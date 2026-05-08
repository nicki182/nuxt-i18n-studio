// Utility to completely remove a key from the JSON object
/**
 *
 * @param obj
 * @param pathStr
 * @param isFlat
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
