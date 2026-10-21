import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { resetAxiosMock, respondWithApi, requestedUrls, axiosRequest } from "../support/axios-mock";
import { POLL_DEADLINE_MS, useCompileHook } from "@/app/project/[id]/use-compile-hook";
import { useProjectEditorHook } from "@/app/project/[id]/use-project-editor-hook";

// Compile builds what the server holds, and nothing saves on a timer or on a
// tab switch. If it stops flushing first, the PDF silently shows the previous
// version while the UI still reports success -- the hardest kind to notice.
const EDITOR_INITIAL = useProjectEditorHook.getState();
const ORIGINAL_DEADLINE = POLL_DEADLINE_MS.value;

function buffers(open: Record<string, string>, onServer: Record<string, string>) {
  useProjectEditorHook.setState({
    projectId: "9",
    activeFileId: Object.keys(open)[0] ?? null,
    fileContents: open,
    savedFileContents: onServer,
    snapshotVersions: Object.fromEntries(Object.keys(open).map((id) => [id, 1])),
  });
}

// Both stores are module singletons shared with every other test file, so dirty
// buffers left here would make another file's compile issue unexpected saves.
afterAll(() => {
  useProjectEditorHook.setState(EDITOR_INITIAL, true);
  POLL_DEADLINE_MS.value = ORIGINAL_DEADLINE;
});

const snapshotPosts = () => requestedUrls().filter((url) => url.includes("/snapshots"));

describe("compile saves before it builds", () => {
  beforeEach(() => {
    resetAxiosMock();
    useCompileHook.getState().reset();
    useProjectEditorHook.setState(EDITOR_INITIAL, true);
    // Nothing here waits on a real build; keep a failed poll from idling.
    POLL_DEADLINE_MS.value = 1;
  });

  it("saves every dirty file, not only the open one", async () => {
    buffers({ "1": "chapter one edited", "2": "chapter two edited" }, { "1": "old", "2": "old" });
    respondWithApi(200, { success: true, data: { content: "edited", version: 2 } });

    await useCompileHook.getState().compile("9");

    expect(snapshotPosts().some((url) => url.includes("/files/1/snapshots"))).toBe(true);
    expect(snapshotPosts().some((url) => url.includes("/files/2/snapshots"))).toBe(true);
  });

  it("saves nothing when no buffer has drifted", async () => {
    buffers({ "1": "same" }, { "1": "same" });
    respondWithApi(200, { success: true, data: { content: "same", version: 1 } });

    await useCompileHook.getState().compile("9");

    expect(snapshotPosts()).toHaveLength(0);
  });

  it("does not queue a build when a save fails", async () => {
    buffers({ "1": "edited" }, { "1": "old" });
    respondWithApi(409, { success: false, message: "Snapshot version conflict." });

    await useCompileHook.getState().compile("9");

    expect(requestedUrls().some((url) => url.endsWith("/compile"))).toBe(false);
    expect(useCompileHook.getState().status).toBe("failure");
  });

  // The old incremental path recorded a range against whichever file was active
  // when the editor reported it, so an offset from one document could be sent
  // against another -- which the API rejects with "Invalid editor change range"
  // and which no retry could clear. A full-range replacement cannot drift.
  it("replaces exactly the span the server is known to hold", async () => {
    buffers({ "1": "new text that is much longer than before" }, { "1": "old" });
    respondWithApi(200, { success: true, data: { content: "x", version: 2 } });

    await useCompileHook.getState().compile("9");

    const save = axiosRequest.mock.calls
      .map(([config]) => config)
      .find((config) => String(config?.url ?? "").includes("/snapshots"));
    expect(save?.data).toMatchObject({
      base_version: 1,
      changes: [{ range_offset: 0, range_length: "old".length, text: "new text that is much longer than before" }],
    });
  });
});
