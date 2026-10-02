import { beforeEach, describe, expect, test } from "bun:test";
import {
  useProjectEditorHook,
  type PendingSnapshotChange,
} from "@/app/project/[id]/use-project-editor-hook";

// The store is a module singleton, so each test starts from a known state.
const INITIAL_STATE = useProjectEditorHook.getState();

beforeEach(() => {
  useProjectEditorHook.setState(INITIAL_STATE, true);
});

const store = () => useProjectEditorHook.getState();

const file = (id: string, name = `${id}.tex`) => ({ id, name, type: "file" as const });

describe("panel visibility", () => {
  test("opening a sidebar tab reveals the sidebar", () => {
    store().setSidebarOpen(false);
    store().setActiveSidebarTab("ai");

    expect(store().activeSidebarTab).toBe("ai");
    expect(store().sidebarOpen).toBe(true);
  });

  // Closing both panels would leave the workspace blank, so the last one open wins.
  test("refuses to close the editor when the preview is already closed", () => {
    store().setPreviewOpen(false);
    store().setEditorOpen(false);

    expect(store().editorOpen).toBe(true);
    expect(store().previewOpen).toBe(false);
  });

  test("refuses to close the preview when the editor is already closed", () => {
    store().setEditorOpen(false);
    store().setPreviewOpen(false);

    expect(store().previewOpen).toBe(true);
    expect(store().editorOpen).toBe(false);
  });

  test("allows closing either panel while both are open", () => {
    store().setPreviewOpen(false);

    expect(store().previewOpen).toBe(false);
    expect(store().editorOpen).toBe(true);
  });

  test("toggles word wrap", () => {
    const before = store().wordWrap;
    store().toggleWordWrap();

    expect(store().wordWrap).toBe(!before);
  });
});

describe("initializeForViewport", () => {
  test("collapses the sidebar and preview on mobile", () => {
    store().initializeForViewport(true);

    expect(store().sidebarOpen).toBe(false);
    expect(store().previewOpen).toBe(false);
    expect(store().editorOpen).toBe(true);
  });

  test("opens everything on desktop", () => {
    store().initializeForViewport(false);

    expect(store().sidebarOpen).toBe(true);
    expect(store().previewOpen).toBe(true);
    expect(store().editorOpen).toBe(true);
  });
});

describe("openFile", () => {
  test("opens a tab, activates it and seeds empty content", () => {
    store().openFile(file("a"));

    expect(store().openFiles.map((entry) => entry.id)).toEqual(["a"]);
    expect(store().activeFileId).toBe("a");
    expect(store().fileContents.a).toBe("");
  });

  test("re-opening an already open file does not duplicate the tab", () => {
    store().openFile(file("a"));
    store().openFile(file("b"));
    store().openFile(file("a"));

    expect(store().openFiles.map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(store().activeFileId).toBe("a");
  });

  // Losing unsaved edits on re-open would be data loss.
  test("re-opening preserves content already in the buffer", () => {
    store().openFile(file("a"));
    store().setFileContent("a", "unsaved work");
    store().openFile(file("a"));

    expect(store().fileContents.a).toBe("unsaved work");
  });

  test("re-opening refreshes the tab's name and metadata", () => {
    store().openFile(file("a", "old.tex"));
    store().openFile({ id: "a", name: "new.tex", type: "file", mimeType: "image/png" });

    expect(store().openFiles[0].name).toBe("new.tex");
    expect(store().openFiles[0].mimeType).toBe("image/png");
  });
});

describe("closeFile", () => {
  test("removes the tab", () => {
    store().openFile(file("a"));
    store().openFile(file("b"));
    store().closeFile("a");

    expect(store().openFiles.map((entry) => entry.id)).toEqual(["b"]);
  });

  test("activates the tab to the left when closing the active one", () => {
    store().openFile(file("a"));
    store().openFile(file("b"));
    store().openFile(file("c"));
    store().setActiveFile("c");
    store().closeFile("c");

    expect(store().activeFileId).toBe("b");
  });

  test("activates the first tab when closing the leftmost", () => {
    store().openFile(file("a"));
    store().openFile(file("b"));
    store().setActiveFile("a");
    store().closeFile("a");

    expect(store().activeFileId).toBe("b");
  });

  test("clears the active file when the last tab closes", () => {
    store().openFile(file("a"));
    store().closeFile("a");

    expect(store().openFiles).toEqual([]);
    expect(store().activeFileId).toBeNull();
  });

  test("closing a background tab leaves the active one alone", () => {
    store().openFile(file("a"));
    store().openFile(file("b"));
    store().setActiveFile("b");
    store().closeFile("a");

    expect(store().activeFileId).toBe("b");
  });

  test("ignores an unknown file id", () => {
    store().openFile(file("a"));
    store().closeFile("missing");

    expect(store().openFiles.map((entry) => entry.id)).toEqual(["a"]);
  });
});

describe("setActiveFileContent", () => {
  test("writes to the active file", () => {
    store().openFile(file("a"));
    store().setActiveFileContent("hello");

    expect(store().fileContents.a).toBe("hello");
  });

  test("is a no-op with no active file", () => {
    store().setActiveFileContent("hello");

    expect(store().fileContents).toEqual({});
  });
});

describe("AI chat prompt history", () => {
  test("submitting moves the prompt into history and collapses the panel", () => {
    store().setAiChatExpanded(true);
    store().setAiChatPrompt("summarise this");
    store().submitAiChatPrompt();

    expect(store().aiChatHistory).toEqual(["summarise this"]);
    expect(store().aiChatPrompt).toBe("");
    expect(store().isAiChatExpanded).toBe(false);
  });

  test("ignores a blank or whitespace-only prompt", () => {
    store().setAiChatPrompt("   ");
    store().submitAiChatPrompt();

    expect(store().aiChatHistory).toEqual([]);
    expect(store().aiChatPrompt).toBe("   ");
  });

  test("trims before storing", () => {
    store().setAiChatPrompt("  padded  ");
    store().submitAiChatPrompt();

    expect(store().aiChatHistory).toEqual(["padded"]);
  });

  test("moves a repeated prompt back to the front instead of duplicating it", () => {
    for (const prompt of ["first", "second", "first"]) {
      store().setAiChatPrompt(prompt);
      store().submitAiChatPrompt();
    }

    expect(store().aiChatHistory).toEqual(["first", "second"]);
  });

  test("keeps only the ten most recent prompts", () => {
    for (let index = 1; index <= 12; index += 1) {
      store().setAiChatPrompt(`prompt ${index}`);
      store().submitAiChatPrompt();
    }

    expect(store().aiChatHistory).toHaveLength(10);
    expect(store().aiChatHistory[0]).toBe("prompt 12");
    expect(store().aiChatHistory).not.toContain("prompt 1");
  });
});

// Monaco emits one change per keystroke; these are coalesced before being sent
// to the snapshot API, so the wire traffic is a fraction of the edit events.
describe("pending snapshot change compaction", () => {
  const append = (changes: PendingSnapshotChange[]) =>
    store().appendPendingSnapshotChanges("a", changes);
  const pending = () => store().pendingSnapshotChanges.a;

  const insert = (offset: number, text: string) => ({
    range_offset: offset,
    range_length: 0,
    text,
  });
  const remove = (offset: number, length: number) => ({
    range_offset: offset,
    range_length: length,
    text: "",
  });

  test("merges consecutive typed characters into one insert", () => {
    append([insert(0, "a"), insert(1, "b"), insert(2, "c")]);

    expect(pending()).toEqual([insert(0, "abc")]);
  });

  test("merges across separate append calls", () => {
    append([insert(0, "a")]);
    append([insert(1, "b")]);

    expect(pending()).toEqual([insert(0, "ab")]);
  });

  test("keeps inserts at unrelated offsets separate", () => {
    append([insert(0, "a"), insert(50, "z")]);

    expect(pending()).toEqual([insert(0, "a"), insert(50, "z")]);
  });

  test("merges forward deletes at the same offset", () => {
    append([remove(5, 1), remove(5, 1)]);

    expect(pending()).toEqual([remove(5, 2)]);
  });

  // Backspace walks the offset backwards, so the merged range starts earlier.
  test("merges backspaces into one widening delete", () => {
    append([remove(5, 1), remove(4, 1)]);

    expect(pending()).toEqual([remove(4, 2)]);
  });

  test("keeps deletes at unrelated offsets separate", () => {
    append([remove(5, 1), remove(20, 1)]);

    expect(pending()).toEqual([remove(5, 1), remove(20, 1)]);
  });

  test("merges adjacent replacements", () => {
    append([
      { range_offset: 0, range_length: 2, text: "xy" },
      { range_offset: 2, range_length: 3, text: "z" },
    ]);

    expect(pending()).toEqual([{ range_offset: 0, range_length: 5, text: "xyz" }]);
  });

  test("does not merge an insert with a delete", () => {
    append([insert(0, "a"), remove(1, 1)]);

    expect(pending()).toHaveLength(2);
  });

  test("tracks each file's changes separately", () => {
    store().appendPendingSnapshotChanges("a", [insert(0, "a")]);
    store().appendPendingSnapshotChanges("b", [insert(0, "b")]);

    expect(store().pendingSnapshotChanges.a).toEqual([insert(0, "a")]);
    expect(store().pendingSnapshotChanges.b).toEqual([insert(0, "b")]);
  });
});
