import fs from "node:fs";
import path from "node:path";

import { collectVueFiles } from "./collectVueFiles";

/**
 * Collects entry points (Vue files) from the specified root directory.
 * @param root - The root directory to search for entry points.
 * @returns An array of file paths to the collected entry points.
 */
export function collectEntryPoints(root: string): string[] {
  const entryDirs = [
    path.join(root, "pages"),
    path.join(root, "layouts"),
    path.join(root, "app", "pages"),
    path.join(root, "app", "layouts"),
  ];

  const results: string[] = [];
  for (const dir of entryDirs) {
    if (fs.existsSync(dir)) {
      results.push(...collectVueFiles(dir));
    }
  }

  return results;
}
