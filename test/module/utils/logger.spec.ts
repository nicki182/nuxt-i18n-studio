import { logger } from "@utils";
import { describe, expect, it, vi } from "vitest";

describe("logger", () => {
  it("logs messages with the log method", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    logger.log("hello");

    expect(logSpy).toHaveBeenCalledWith("hello");
  });

  it("logs success messages with a checkmark prefix", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    logger.success("done");

    expect(logSpy).toHaveBeenCalledWith("✅ done");
  });

  it("warns with a warning prefix", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    logger.warn("careful");

    expect(warnSpy).toHaveBeenCalledWith("⚠️ careful");
  });

  it("errors with an error prefix", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    logger.error("boom");

    expect(errorSpy).toHaveBeenCalledWith("❌ boom");
  });
});
