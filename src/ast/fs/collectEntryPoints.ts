import fs from "node:fs";
import path from "node:path";

import { collectVueFiles } from "./collectVueFiles";

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
