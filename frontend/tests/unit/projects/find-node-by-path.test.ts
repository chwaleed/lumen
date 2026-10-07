import { describe, expect, it } from "bun:test";
import { findNodeByPath } from "@/lib/projects";
import type { FileNode } from "@/components/editor-sidebar";

const tree: FileNode[] = [
  { id: "1", name: "main.tex", type: "file" },
  {
    id: "2",
    name: "sections",
    type: "folder",
    children: [
      { id: "3", name: "intro.tex", type: "file" },
      { id: "4", name: "bad.tex", type: "file" },
      {
        id: "5",
        name: "appendix",
        type: "folder",
        children: [{ id: "6", name: "extra.tex", type: "file" }],
      },
    ],
  },
  { id: "7", name: "refs.bib", type: "file" },
];

describe("findNodeByPath", () => {
  it("finds a file at the project root", () => {
    expect(findNodeByPath(tree, "main.tex")?.id).toBe("1");
  });

  it("finds a file inside a folder", () => {
    // The case that matters: a compiler error inside an \input-ed subfile.
    expect(findNodeByPath(tree, "sections/bad.tex")?.id).toBe("4");
  });

  it("finds a file nested two folders deep", () => {
    expect(findNodeByPath(tree, "sections/appendix/extra.tex")?.id).toBe("6");
  });

  it("ignores a leading ./ as the compiler writes it", () => {
    expect(findNodeByPath(tree, "./sections/intro.tex")?.id).toBe("3");
  });

  it("returns null for a path that does not exist", () => {
    expect(findNodeByPath(tree, "sections/missing.tex")).toBeNull();
  });

  it("returns null when the path names a folder", () => {
    expect(findNodeByPath(tree, "sections")).toBeNull();
  });

  it("does not walk through a file as if it were a folder", () => {
    expect(findNodeByPath(tree, "main.tex/nested.tex")).toBeNull();
  });

  it("returns null for an empty path", () => {
    expect(findNodeByPath(tree, "")).toBeNull();
  });
});
