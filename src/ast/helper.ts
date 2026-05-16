import type { ValueMap } from "./types";

export function addToMap(map: ValueMap, key: string, value: string) {
  if (!map.has(key)) map.set(key, []);
  const arr = map.get(key)!;
  if (!arr.includes(value)) arr.push(value);
}
