import fs from "node:fs";
import path from "node:path";

const EXCLUDED_DIRS = ["node_modules", "dist", ".nuxt", ".output"];

export function collectVueFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (EXCLUDED_DIRS.includes(entry.name) || entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectVueFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".vue")) {
      results.push(fullPath);
    }
  }

  return results;
}
