import { describe, expect, test } from "bun:test";
import {
  buildFileTree,
  createFileContents,
  createSnapshotVersions,
  findInitialOpenFile,
  type ProjectFileEntry,
} from "@/lib/projects";

function entry(overrides: Partial<ProjectFileEntry> & Pick<ProjectFileEntry, "id" | "name">): ProjectFileEntry {
  return {
    parent_id: null,
    type: "file",
    mime_type: null,
    file_url: null,
    content: null,
    snapshot_version: null,
    ...overrides,
  } as ProjectFileEntry;
}

describe("buildFileTree", () => {
  test("returns an empty tree for no entries", () => {
    expect(buildFileTree([])).toEqual([]);
  });

  test("nests children under their parent", () => {
    const tree = buildFileTree([
      entry({ id: 1, name: "chapters", type: "folder" }),
      entry({ id: 2, name: "intro.tex", parent_id: 1 }),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].children?.map((node) => node.name)).toEqual(["intro.tex"]);
  });

  test("nests to arbitrary depth", () => {
    const tree = buildFileTree([
      entry({ id: 1, name: "top", type: "folder" }),
      entry({ id: 2, name: "middle", type: "folder", parent_id: 1 }),
      entry({ id: 3, name: "leaf.tex", parent_id: 2 }),
    ]);

    expect(tree[0].children?.[0].children?.[0].name).toBe("leaf.tex");
  });

  test("sorts folders before files, then alphabetically", () => {
    const tree = buildFileTree([
      entry({ id: 1, name: "zeta.tex" }),
      entry({ id: 2, name: "alpha.tex" }),
      entry({ id: 3, name: "zebra", type: "folder" }),
      entry({ id: 4, name: "apples", type: "folder" }),
    ]);

    expect(tree.map((node) => node.name)).toEqual(["apples", "zebra", "alpha.tex", "zeta.tex"]);
  });

  test("stringifies numeric ids, since the tree works in strings", () => {
    expect(buildFileTree([entry({ id: 42, name: "main.tex" })])[0].id).toBe("42");
  });

  // Root folders start open so the tree is not a wall of collapsed rows on load.
  test("opens root folders by default", () => {
    const tree = buildFileTree([entry({ id: 1, name: "chapters", type: "folder" })]);

    expect(tree[0].isOpen).toBe(true);
  });

  test("leaves nested folders closed unless remembered as open", () => {
    const entries = [
      entry({ id: 1, name: "top", type: "folder" }),
      entry({ id: 2, name: "nested", type: "folder", parent_id: 1 }),
    ];

    expect(buildFileTree(entries)[0].children?.[0].isOpen).toBe(false);
    expect(buildFileTree(entries, new Set(["2"]))[0].children?.[0].isOpen).toBe(true);
  });

  test("gives files no open state at all", () => {
    expect(buildFileTree([entry({ id: 1, name: "main.tex" })])[0].isOpen).toBeUndefined();
  });

  test("carries file metadata through", () => {
    const tree = buildFileTree([
      entry({ id: 1, name: "figure.png", mime_type: "image/png", file_url: "https://example.com/f.png" }),
    ]);

    expect(tree[0].mimeType).toBe("image/png");
    expect(tree[0].fileUrl).toBe("https://example.com/f.png");
  });

  // An entry whose parent is missing from the payload must not vanish silently
  // into a tree nobody renders — it simply never appears under the root.
  test("drops entries whose parent is absent", () => {
    const tree = buildFileTree([entry({ id: 2, name: "orphan.tex", parent_id: 999 })]);

    expect(tree).toEqual([]);
  });
});

describe("createFileContents", () => {
  test("maps file ids to their content", () => {
    const contents = createFileContents([
      entry({ id: 1, name: "main.tex", content: "\\documentclass{article}" }),
      entry({ id: 2, name: "empty.tex" }),
    ]);

    expect(contents).toEqual({ "1": "\\documentclass{article}", "2": "" });
  });

  test("ignores folders", () => {
    const contents = createFileContents([
      entry({ id: 1, name: "chapters", type: "folder" }),
      entry({ id: 2, name: "main.tex", content: "x" }),
    ]);

    expect(Object.keys(contents)).toEqual(["2"]);
  });
});

describe("createSnapshotVersions", () => {
  test("defaults a missing version to zero", () => {
    const versions = createSnapshotVersions([
      entry({ id: 1, name: "main.tex", snapshot_version: 7 }),
      entry({ id: 2, name: "fresh.tex" }),
    ]);

    expect(versions).toEqual({ "1": 7, "2": 0 });
  });
});

describe("findInitialOpenFile", () => {
  test("prefers main.tex wherever it sits in the list", () => {
    const found = findInitialOpenFile([
      entry({ id: 1, name: "appendix.tex" }),
      entry({ id: 2, name: "main.tex" }),
    ]);

    expect(found?.name).toBe("main.tex");
  });

  test("falls back to the first file", () => {
    const found = findInitialOpenFile([
      entry({ id: 1, name: "appendix.tex" }),
      entry({ id: 2, name: "notes.tex" }),
    ]);

    expect(found?.name).toBe("appendix.tex");
  });

  test("skips folders when choosing", () => {
    const found = findInitialOpenFile([
      entry({ id: 1, name: "chapters", type: "folder" }),
      entry({ id: 2, name: "notes.tex" }),
    ]);

    expect(found?.name).toBe("notes.tex");
  });

  test("returns null when the project has no files", () => {
    expect(findInitialOpenFile([])).toBeNull();
    expect(findInitialOpenFile([entry({ id: 1, name: "empty", type: "folder" })])).toBeNull();
  });
});
