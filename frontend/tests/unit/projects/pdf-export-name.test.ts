import { describe, expect, it } from "bun:test";
import { pdfExportName } from "@/lib/projects";

describe("pdfExportName", () => {
  it("uses the project name as-is", () => {
    expect(pdfExportName("My Thesis")).toBe("My Thesis");
  });

  it("replaces path separators", () => {
    // A slash would make the browser reject the download attribute or read the
    // name as a directory.
    expect(pdfExportName("2026/draft")).toBe("2026-draft");
    expect(pdfExportName("chapters\\intro")).toBe("chapters-intro");
  });

  it("falls back when the name would leave nothing usable", () => {
    // "" would hand the browser no name at all, and it would save the file as
    // "pdf" -- the URL's last segment -- with no extension.
    expect(pdfExportName("")).toBe("project");
    expect(pdfExportName("   ")).toBe("project");
  });

  it("trims surrounding whitespace", () => {
    expect(pdfExportName("  Report  ")).toBe("Report");
  });
});
