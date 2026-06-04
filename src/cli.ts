#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";

import { runAnalyze } from "./cli/analyze";

const args = process.argv.slice(2);
const command = args[0];

// ── analyze command ───────────────────────────────────────────────────────────

if (command === "analyze") {
  const rootIndex = args.findIndex((a) => a === "--root" || a === "-r");
  const outputIndex = args.findIndex((a) => a === "--output" || a === "-o");

  const root =
    rootIndex > -1 ? (args[rootIndex + 1] ?? process.cwd()) : process.cwd();
  const output =
    outputIndex > -1
      ? (args[outputIndex + 1] ?? ".i18n-studio/prop-map.json")
      : ".i18n-studio/prop-map.json";

  runAnalyze({ root: path.resolve(root), output });
  process.exit(0);
}

// ── dev / build commands (existing behaviour, unchanged) ─────────────────────

const portIndex = args.findIndex((arg) => arg === "--port" || arg === "-p");
const port = portIndex > -1 ? (args[portIndex + 1] ?? "4000") : "4000";

const isProd = args.includes("--prod") || args.includes("--build");

const studioEnv = {
  ...process.env,
  I18N_STUDIO_MODE: "true",
};

if (isProd) {
  console.log(
    `\n📦 Building & Serving in Staging Mode (GitHub PRs Enabled) on port ${port}...\n`,
  );

  const buildProcess = spawn("npx", ["nuxi", "build"], {
    stdio: "inherit",
    shell: true,
    env: studioEnv,
  });

  buildProcess.on("close", (code) => {
    if (code === 0) {
      spawn("npx", ["nuxi", "preview", "--port", port], {
        stdio: "inherit",
        shell: true,
        env: studioEnv,
      });
    }
  });
} else {
  console.log(
    `\n✨ Starting in Local Dev Mode (Direct File Save) on port ${port}...\n`,
  );
  spawn("npx", ["nuxi", "dev", "--port", port], {
    stdio: "inherit",
    shell: true,
    env: studioEnv,
  });
}

export {};
