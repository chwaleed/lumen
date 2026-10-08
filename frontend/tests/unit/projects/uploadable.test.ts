import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UPLOADABLE_EXTENSIONS, fileExtension, isUploadable } from "@/lib/projects";

describe("fileExtension", () => {
  it("lowercases the extension", () => {
    expect(fileExtension("FIGURE.PNG")).toBe(".png");
  });

  it("takes only the final extension", () => {
    expect(fileExtension("archive.tar.gz")).toBe(".gz");
  });

  it("returns empty for a name with no extension", () => {
    expect(fileExtension("Makefile")).toBe("");
  });

  it("does not treat a dotfile as an extension", () => {
    expect(fileExtension(".gitignore")).toBe("");
  });
});

describe("isUploadable", () => {
  it.each([["refs.bib"], ["thesis.cls"], ["custom.sty"], ["plain.bst"], ["figure.png"], ["plot.pdf"]])(
    "allows %s, which real projects need",
    (name) => {
      expect(isUploadable(name)).toBe(true);
    },
  );

  it.each([["payload.exe"], ["archive.zip"], ["run.sh"], ["Makefile"]])(
    "rejects %s",
    (name) => {
      expect(isUploadable(name)).toBe(false);
    },
  );

  it("rejects an uploaded .tex, which the editor owns through snapshots", () => {
    expect(isUploadable("chapter.tex")).toBe(false);
  });

  it("is case insensitive", () => {
    expect(isUploadable("FIGURE.PNG")).toBe(true);
  });
});

describe("allowlist drift", () => {
  it("matches the backend's ALLOWED_EXTENSIONS exactly", () => {
    // The backend is the authority; this list exists only to fail fast in the
    // browser. Two hand-maintained copies drift, so compare them directly.
    const source = readFileSync(
      join(import.meta.dir, "../../../../backend/src/uploads/service.py"),
      "utf8",
    );
    const block = source.slice(
      source.indexOf("ALLOWED_EXTENSIONS"),
      source.indexOf("def _safe_file_name"),
    );
    const backend = [...block.matchAll(/"(\.[a-z0-9]+)":/g)].map((match) => match[1]).sort();

    expect(backend.length).toBeGreaterThan(0);
    // Widened: the constant is a readonly tuple of literals, and toEqual will
    // not match that against the plain strings scraped out of the backend.
    expect([...UPLOADABLE_EXTENSIONS].sort() as string[]).toEqual(backend);
  });
});
