#!/usr/bin/env node
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
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
