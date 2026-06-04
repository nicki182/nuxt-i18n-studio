import { defineEventHandler, readValidatedBody, createError } from "h3";
import fs from "node:fs/promises";
import path from "node:path";
import { Octokit } from "octokit";
import { z } from "zod";

import type { Config } from "../../../types/config";

import { deleteJSONKey } from "../../../utils/deleteJSONkey";
import { updateJSON } from "../../../utils/updateJSON";
// ── Validation ────────────────────────────────────────────────────────────────

const updateSchema = z.object({
  updates: z.record(z.string(), z.string()),
  locale: z.string().min(1).max(10).default("en"),
  clearOtherLocales: z.boolean().default(false),
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface FileToUpdate {
  path: string;
  githubPath: string;
  content: Record<string, unknown>;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, updateSchema.parse);
  const config = useRuntimeConfig(event).public.i18nStudio as Config;
  const localeAliases = config.localeAliases ?? {};
  console.log("Received update request:", localeAliases, body.locale);
  const targetLocale = localeAliases[body.locale]?.default ?? body.locale;
  const localesDir = path.resolve(
    process.cwd(),
    config?.localesPath ?? "i18n/locales",
  );

  const filesToUpdate: FileToUpdate[] = [];

  // ── 1. Build target locale update ──────────────────────────────────────────
  const targetFilePath = path.resolve(localesDir, `${targetLocale}.json`);

  let targetContent: Record<string, unknown>;
  console.log("Reading target locale file:", targetFilePath);
  try {
    targetContent = JSON.parse(await fs.readFile(targetFilePath, "utf-8"));
  } catch {
    throw createError({
      statusCode: 404,
      message: `Locale file not found: ${targetLocale}.json`,
    });
  }

  let targetUpdated = { ...targetContent } as Record<string, unknown>;
  for (const [key, newValue] of Object.entries(body.updates)) {
    targetUpdated = updateJSON(
      targetUpdated,
      key,
      newValue as string,
      config?.isFlatJson,
    ) ?? {};
  };

  filesToUpdate.push({
    path: targetFilePath,
    githubPath: path.join(
      config?.localesPath ?? "i18n/locales",
      `${targetLocale}.json`,
    ),
    content: targetUpdated,
  });

  // ── 2. Optionally clear keys from other locales ─────────────────────────────
  if (body.clearOtherLocales) {
    // Back up before deleting — safety net for accidental clears
    if (import.meta.dev) {
      const backupDir = path.resolve(localesDir, ".i18n-studio-backup");
      await fs.mkdir(backupDir, { recursive: true });
    }

    const allFiles = await fs.readdir(localesDir);
    const otherLocales = allFiles.filter(
      (f) => f.endsWith(".json") && f !== `${targetLocale}.json`,
    );

    for (const filename of otherLocales) {
      const filePath = path.resolve(localesDir, filename);

      let fileContent: Record<string, unknown>;
      try {
        fileContent = JSON.parse(await fs.readFile(filePath, "utf-8"));
      } catch {
        // Skip unreadable locale files rather than failing the whole operation
        continue;
      }

      // Back up before modifying
      if (import.meta.dev) {
        const backupDir = path.resolve(localesDir, ".i18n-studio-backup");
        const backupPath = path.resolve(
          backupDir,
          `${filename}.${Date.now()}.bak`,
        );
        await fs.copyFile(filePath, backupPath);
      }

      let updatedOther = { ...fileContent };
      for (const [key] of Object.entries(body.updates)) {
        updatedOther = deleteJSONKey(updatedOther, key, config?.isFlatJson);
      }

      filesToUpdate.push({
        path: filePath,
        githubPath: path.join(config?.localesPath ?? "i18n/locales", filename),
        content: updatedOther,
      });
    }
  }

  if (filesToUpdate.length === 0) {
    throw createError({ statusCode: 400, message: "No files to update" });
  }

  // ── 3. Dev mode — write directly to disk ───────────────────────────────────
  if (import.meta.dev) {
    for (const file of filesToUpdate) {
      await fs.writeFile(
        file.path,
        JSON.stringify(file.content, null, 2) + "\n",
      );
    }

    return {
      success: true,
      json: filesToUpdate[0]?.content ?? {},
      updates: body.updates,
    };
  }

  // ── 4. Production mode — create GitHub PR via Octokit ─────────────────────
  const session = await requireUserSession(event);
  const token = session.secure?.githubToken;

  if (!token) {
    throw createError({ statusCode: 401, message: "GitHub token missing" });
  }
  if (!config?.githubRepo) {
    throw createError({
      statusCode: 500,
      message: "githubRepo not configured — add it to i18nStudio.githubRepo",
    });
  }

  const [owner = "", repo = ""] = config.githubRepo.split("/");
  if (!owner || !repo) {
    throw createError({
      statusCode: 500,
      message: "githubRepo must be in the format 'owner/repo'",
    });
  }

  const octokit = new Octokit({ auth: token });

  try {
    // A. Get default branch and latest commit SHA
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;

    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
    });
    const baseSha = refData.object.sha;

    // B. Check for existing open i18n Studio PRs to warn about conflicts
    const { data: openPRs } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "open",
    });
    const conflictingPR = openPRs.find((pr) =>
      pr.head.ref.startsWith("i18n-studio-update-"),
    );
    if (conflictingPR) {
      return {
        success: false,
        conflict: true,
        existingPrUrl: conflictingPR.html_url,
        message: `An open i18n Studio PR already exists. Merge or close it before creating a new one.`,
      };
    }

    // C. Create tree with all updated files
    const tree = filesToUpdate.map((file) => ({
      path: file.githubPath,
      mode: "100644" as const,
      type: "blob" as const,
      content: JSON.stringify(file.content, null, 2) + "\n",
    }));

    const { data: treeData } = await octokit.rest.git.createTree({
      owner,
      repo,
      base_tree: baseSha,
      tree,
    });

    // D. Create commit
    const firstKey = Object.keys(body.updates)[0] ?? "keys";
    const extraCount = Object.keys(body.updates).length - 1;
    const commitMsg = `chore(i18n): update translation for ${firstKey}${
      extraCount > 0 ? ` + ${extraCount} more` : ""
    }`;

    const { data: commitData } = await octokit.rest.git.createCommit({
      owner,
      repo,
      message: commitMsg,
      tree: treeData.sha,
      parents: [baseSha],
    });

    // E. Create branch and PR
    const branchName = `i18n-studio-update-${Date.now()}`;
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: commitData.sha,
    });

    const { data: prData } = await octokit.rest.pulls.create({
      owner,
      repo,
      title: commitMsg,
      head: branchName,
      base: defaultBranch,
      body: [
        "Updated translations via Nuxt i18n Studio.",
        "",
        "Keys updated:",
        ...Object.keys(body.updates).map((k) => `- \`${k}\``),
      ].join("\n"),
    });

    return {
      success: true,
      prUrl: prData.html_url,
      json: filesToUpdate[0]?.content ?? {},
      updates: body.updates,
    };
  } catch (error: unknown) {
    // Re-throw H3 errors (createError) as-is
    if (typeof error === "object" && error !== null && "statusCode" in error) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw createError({
      statusCode: 500,
      message: `GitHub operation failed: ${message}`,
    });
  }
});
