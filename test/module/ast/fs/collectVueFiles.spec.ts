import { collectVueFiles } from "@ast/fs/collectVueFiles";
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("collectVueFiles", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an empty array when the directory cannot be read", () => {
    vi.spyOn(fs, "readdirSync").mockImplementation(() => {
      throw new Error("read failed");
    });

    expect(collectVueFiles("/tmp/missing")).toEqual([]);
  });

  it("collects .vue files recursively and skips excluded directories", () => {
    const readdirSyncMock = vi.spyOn(fs, "readdirSync");

    readdirSyncMock
      .mockImplementationOnce((dir: fs.PathLike) => {
        if (dir.toString() === "/tmp/project") {
          return [
            {
              name: "index.vue",
              isFile: () => true,
              isDirectory: () => false,
            } as fs.Dirent,
            {
              name: "components",
              isFile: () => false,
              isDirectory: () => true,
            } as fs.Dirent,
            {
              name: "node_modules",
              isFile: () => false,
              isDirectory: () => true,
            } as fs.Dirent,
            {
              name: ".nuxt",
              isFile: () => false,
              isDirectory: () => true,
            } as fs.Dirent,
          ] as unknown as fs.Dirent[];
        }

        throw new Error("unexpected dir");
      })
      .mockImplementationOnce((dir: fs.PathLike) => {
        if (dir.toString() === path.join("/tmp/project", "components")) {
          return [
            {
              name: "Button.vue",
              isFile: () => true,
              isDirectory: () => false,
            } as fs.Dirent,
            {
              name: "subdir",
              isFile: () => false,
              isDirectory: () => true,
            } as fs.Dirent,
          ] as unknown as fs.Dirent[];
        }

        throw new Error("unexpected dir");
      })
      .mockImplementationOnce((dir: fs.PathLike) => {
        if (
          dir.toString() === path.join("/tmp/project", "components", "subdir")
        ) {
          return [
            {
              name: "Page.vue",
              isFile: () => true,
              isDirectory: () => false,
            } as fs.Dirent,
          ] as unknown as fs.Dirent[];
        }

        throw new Error("unexpected dir");
      });

    expect(collectVueFiles("/tmp/project")).toEqual([
      "/tmp/project/index.vue",
      "/tmp/project/components/Button.vue",
      "/tmp/project/components/subdir/Page.vue",
    ]);
  });
});
