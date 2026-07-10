import { collectEntryPoints } from "@ast/fs/collectEntryPoints";
import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const collectVueFilesMock = vi.hoisted(() => vi.fn());

vi.mock("@ast/fs/collectVueFiles", () => ({
  collectVueFiles: collectVueFilesMock,
}));

describe("collectEntryPoints", () => {
  beforeEach(() => {
    collectVueFilesMock.mockReset();
    vi.restoreAllMocks();
  });

  it("collects Vue files from existing entry directories", () => {
    vi.spyOn(fs, "existsSync").mockImplementation((p: fs.PathLike) => {
      return p.toString() === "/root/pages";
    });

    collectVueFilesMock.mockImplementation((dir: string) => {
      return dir === "/root/pages" ? ["/root/pages/index.vue"] : [];
    });

    const result = collectEntryPoints("/root");

    expect(result).toEqual(["/root/pages/index.vue"]);
    expect(collectVueFilesMock).toHaveBeenCalledWith("/root/pages");
  });

  it("returns an empty array when no entry directories exist", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    const result = collectEntryPoints("/root");

    expect(result).toEqual([]);
    expect(collectVueFilesMock).not.toHaveBeenCalled();
  });
});
