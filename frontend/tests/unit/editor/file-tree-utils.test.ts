import { describe, expect, test } from "bun:test";
import {
  addNode,
  deleteNode,
  moveNode,
  preserveOpenState,
  updateNode,
} from "@/components/editor-sidebar/file-tree-utils";
import type { FileNode } from "@/components/editor-sidebar/types";

function tree(): FileNode[] {
  return [
    { id: "main", name: "main.tex", type: "file" },
    {
      id: "chapters", name: "chapters", type: "folder", isOpen: true,
      children: [
        { id: "intro", name: "intro.tex", type: "file" },
        { id: "deep", name: "deep", type: "folder", isOpen: false, children: [] },
      ],
    },
  ];
}

const names = (nodes: FileNode[]) => nodes.map((node) => node.name);
const byId = (nodes: FileNode[], id: string): FileNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = node.children ? byId(node.children, id) : undefined;
    if (found) return found;
  }
  return undefined;
};

describe("addNode", () => {
  test("sorts folders before files, then alphabetically", () => {
    const next = addNode(tree(), "root", { id: "a", name: "appendix", type: "folder", children: [] });

    expect(names(next)).toEqual(["appendix", "chapters", "main.tex"]);
  });

  test("opens the parent folder so the new child is visible", () => {
    const next = addNode(tree(), "deep", { id: "n", name: "note.tex", type: "file" });

    expect(byId(next, "deep")?.isOpen).toBe(true);
    expect(byId(next, "n")?.name).toBe("note.tex");
  });
});

describe("deleteNode", () => {
  test("removes a nested node and leaves its siblings alone", () => {
    const next = deleteNode(tree(), "intro");

    expect(byId(next, "intro")).toBeUndefined();
    expect(byId(next, "deep")).toBeDefined();
    expect(byId(next, "main")).toBeDefined();
  });
});

describe("updateNode", () => {
  test("applies the updater to a nested node only", () => {
    const next = updateNode(tree(), "intro", (node) => ({ ...node, name: "renamed.tex" }));

    expect(byId(next, "intro")?.name).toBe("renamed.tex");
    expect(byId(next, "main")?.name).toBe("main.tex");
  });
});

describe("moveNode", () => {
  test("moves a file into a folder", () => {
    const next = moveNode(tree(), "main", "chapters");

    expect(next.some((node) => node.id === "main")).toBe(false);
    expect(byId(next, "chapters")?.children?.map((child) => child.id)).toContain("main");
  });

  // Dragging a folder into its own subtree would detach the branch from the tree.
  test("refuses to move a folder into its own descendant", () => {
    const before = tree();

    expect(moveNode(before, "chapters", "deep")).toEqual(before);
  });

  test("refuses to move a node into itself", () => {
    const before = tree();

    expect(moveNode(before, "chapters", "chapters")).toEqual(before);
  });

  test("ignores an unknown node id", () => {
    const before = tree();

    expect(moveNode(before, "missing", "chapters")).toEqual(before);
  });
});

describe("preserveOpenState", () => {
  test("carries folder open/closed state across a server refresh", () => {
    const current = tree();
    const expanded = updateNode(current, "deep", (node) => ({ ...node, isOpen: true }));

    // The server never sends isOpen; it is a client-only concern.
    const fromServer: FileNode[] = [
      {
        id: "chapters", name: "chapters", type: "folder",
        children: [{ id: "deep", name: "deep", type: "folder", children: [] }],
      },
    ];

    const next = preserveOpenState(fromServer, expanded);

    expect(byId(next, "chapters")?.isOpen).toBe(true);
    expect(byId(next, "deep")?.isOpen).toBe(true);
  });
});
