import fs from "node:fs/promises";
import path from "node:path";
import { Octokit } from "octokit";
import { z } from "zod";

import type { Config } from "../../../types/config";

import { deleteJSONKey } from "../../../utils/deleteJSONkey";
import { updateJSON } from "../../../utils/updateJSON";

const updateSchema = z.object({
  updates: z.record(z.string(), z.string()),
  locale: z.string().default("en"),
  clearOtherLocales: z.boolean().default(false),
});

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, updateSchema.parse);
  const config = useRuntimeConfig(event).public.i18nStudio as Config;

  const targetLocale = body.locale;
  const localesDir = path.resolve(
    process.cwd(),
    config?.localesPath || "i18n/locales",
  );

  // Array to hold files that need to be committed
  const filesToUpdate: {
    path: string;
    githubPath: string;
    content: Record<string, string>;
  }[] = [];

  try {
    // ── 1. TARGET LOCALE UPDATES ──────────────────────────────
    const targetFilePath = path.resolve(localesDir, `${targetLocale}.json`);
    const targetContent = JSON.parse(
      await fs.readFile(targetFilePath, "utf-8"),
    );

    let targetUpdated = { ...targetContent };
    for (const [key, newValue] of Object.entries(body.updates)) {
      targetUpdated = updateJSON(
        targetUpdated,
        key,
        newValue,
        config?.isFlatJson,
      );
    }

    filesToUpdate.push({
      path: targetFilePath,
      githubPath: path.join(
        config?.localesPath || "i18n/locales",
        `${targetLocale}.json`,
      ),
      content: targetUpdated,
    });
    // ── 2. DELETE FROM OTHER LOCALES (IF CHECKED) ─────────────
    if (body.clearOtherLocales) {
      const allFiles = await fs.readdir(localesDir);
      const otherLocales = allFiles.filter(
        (f) => f.endsWith(".json") && f !== `${targetLocale}.json`,
      );

      for (const filename of otherLocales) {
        const filePath = path.resolve(localesDir, filename);
        const fileContent = JSON.parse(await fs.readFile(filePath, "utf-8"));

        let updatedOther = { ...fileContent };
        for (const [key] of Object.entries(body.updates)) {
          // Completely delete the key instead of setting to ""
          updatedOther = deleteJSONKey(updatedOther, key, config?.isFlatJson);
        }

        filesToUpdate.push({
          path: filePath,
          githubPath: path.join(
            config?.localesPath || "i18n/locales",
            filename,
          ),
          content: updatedOther,
        });
      }
    }

    // ── 3. LOCAL DEV MODE (WRITE TO DISK) ────────────────────
    if (import.meta.dev) {
      for (const file of filesToUpdate) {
        await fs.writeFile(
          file.path,
          JSON.stringify(file.content, null, 2) + "\n",
        );
      }
      if (filesToUpdate.length < 0)
        return { success: false, message: "No files to update" };
      return {
        success: true,
        json: filesToUpdate[0]?.content ?? {},
        updates: body.updates,
      };
    }

    // ── 4. PRODUCTION MODE (OCTOKIT GITHUB PR) ───────────────
    else {
      const session = await requireUserSession(event);
      const token = session.secure?.githubToken;

      if (!token)
        throw createError({ statusCode: 401, message: "GitHub token missing" });
      if (!config?.githubRepo)
        throw createError({
          statusCode: 500,
          message: "githubRepo not set in config",
        });

      const [owner = "", repo = ""] = config.githubRepo.split("/");
      const octokit = new Octokit({ auth: token });

      // A. Get the default branch and its latest commit SHA
      const { data: repoData } = await octokit.rest.repos.get({
        owner: owner,
        repo: repo,
      });
      const defaultBranch = repoData.default_branch;
      const { data: refData } = await octokit.rest.git.getRef({
        owner: owner,
        repo: repo,
        ref: `heads/${defaultBranch}`,
      });
      const baseSha = refData.object.sha;

      // B. Create a new Tree containing all updated JSON files
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

      // C. Create a Commit
      const firstKey = Object.keys(body.updates)[0];
      const commitMsg = `chore(i18n): update translation for ${firstKey} ${Object.keys(body.updates).length > 1 ? "+ more" : ""}`;

      const { data: commitData } = await octokit.rest.git.createCommit({
        owner,
        repo,
        message: commitMsg,
        tree: treeData.sha,
        parents: [baseSha],
      });

      // D. Create a new Branch
      const branchName = `i18n-studio-update-${Date.now()}`;
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: commitData.sha,
      });

      // E. Create the Pull Request
      const { data: prData } = await octokit.rest.pulls.create({
        owner,
        repo,
        title: commitMsg,
        head: branchName,
        base: defaultBranch,
        body: `Updated translations via Nuxt i18n Studio.\n\nKeys updated:\n${Object.keys(
          body.updates,
        )
          .map((k) => `- \`${k}\``)
          .join("\n")}`,
      });

      return {
        success: true,
        prUrl: prData.html_url,
        json: filesToUpdate[0]?.content ?? {},
        updates: body.updates,
      };
    }
  } catch (error: unknown) {
    console.error(error);

    // Safely extract message
    const message = error instanceof Error ? error.message : String(error);

    // Safely extract status code
    const isErrorObject = typeof error === "object" && error !== null;
    const statusCode =
      isErrorObject && "statusCode" in error
        ? Number(error.statusCode)
        : isErrorObject && "status" in error
          ? Number(error.status)
          : 500;

    throw createError({
      statusCode,
      message: `Studio Save Error: ${message}`,
    });
  }
});
