/**
 *
 * @param map
 * @param key
 * @param value
 */
export function addToMap(
  map: Map<string, string[]>,
  key: string,
  value: string,
) {
  if (!map.has(key)) map.set(key, []);
  const arr = map.get(key)!;
  if (!arr.includes(value)) arr.push(value);
}
