import { describe, expect, it } from "bun:test";
import { exportBaseName } from "@/lib/projects";

describe("exportBaseName", () => {
  it("uses the project name as-is", () => {
    expect(exportBaseName("My Thesis")).toBe("My Thesis");
  });

  it("replaces path separators", () => {
    // A slash would make the browser reject the download attribute or read the
    // name as a directory.
    expect(exportBaseName("2026/draft")).toBe("2026-draft");
    expect(exportBaseName("chapters\\intro")).toBe("chapters-intro");
  });

  it("falls back when the name would leave nothing usable", () => {
    // "" would hand the browser no name at all, and it would save the file as
    // "pdf" -- the URL's last segment -- with no extension.
    expect(exportBaseName("")).toBe("project");
    expect(exportBaseName("   ")).toBe("project");
  });

  it("trims surrounding whitespace", () => {
    expect(exportBaseName("  Report  ")).toBe("Report");
  });
});
