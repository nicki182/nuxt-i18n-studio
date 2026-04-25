// 🛠️ SMART HELPER: Handles both flat {"a.b":"val"} and nested {a: {b: "val"}}
export function updateTranslation(json: any, key: string, newValue: string) {
  let update = { ...json };
  // Case 1: It's a flat JSON file, and the exact key exists!
  if (key in json) {
    json[key] = newValue
    return
  }

  // Case 2: It's a nested JSON file (split by dot and traverse)
  const parts = key.split('.')
  let current = json

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!(part in current)) {
      current[part] = {} // Create nested object if it doesn't exist
    }
    current = current[part]
  }

  // Set the final value at the deepest level
  current[parts[parts.length - 1]] = newValue

  return update
}
