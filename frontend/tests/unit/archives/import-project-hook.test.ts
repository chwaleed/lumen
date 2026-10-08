import { beforeEach, describe, expect, it } from "bun:test";
import {
  axiosRequest,
  resetAxiosMock,
  respondWithApi,
} from "../support/axios-mock";
import { useDashboardProjectsHook } from "@/app/(dashboard)/use-dashboard-projects-hook";

const INITIAL_STATE = useDashboardProjectsHook.getState();

function zipFile(name = "Thesis.zip") {
  return new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], name, {
    type: "application/zip",
  });
}

function imported(overrides: Record<string, unknown> = {}) {
  return {
    project: {
      id: 12,
      name: "Thesis",
      created_at: "2026-10-09T00:00:00Z",
      updated_at: "2026-10-09T00:00:00Z",
    },
    imported: ["main.tex"],
    skipped: [],
    ...overrides,
  };
}

describe("importProject", () => {
  beforeEach(() => {
    resetAxiosMock();
    useDashboardProjectsHook.setState(INITIAL_STATE, true);
  });

  it("returns the new project's id so the caller can open it", async () => {
    respondWithApi(201, { success: true, data: imported() });

    const projectId = await useDashboardProjectsHook.getState().importProject(zipFile());

    expect(projectId).toBe("12");
    expect(useDashboardProjectsHook.getState().createStatus).toBe("idle");
  });

  it("sends the file as the body with its name in the query", async () => {
    respondWithApi(201, { success: true, data: imported() });

    await useDashboardProjectsHook.getState().importProject(zipFile("My Thesis.zip"));

    const request = axiosRequest.mock.calls[0][0];
    expect(request.method).toBe("POST");
    expect(request.url).toBe("/api/projects/import?file_name=My%20Thesis.zip");
    expect(request.headers["Content-Type"]).toBe("application/zip");
    // The File itself, not a FormData wrapper around it.
    expect(request.data).toBeInstanceOf(File);
  });

  it("puts the imported project at the top of the list", async () => {
    useDashboardProjectsHook.setState({
      projects: [{ id: "1", name: "Old", updatedAt: "now", tags: [] }],
    });
    respondWithApi(201, { success: true, data: imported() });

    await useDashboardProjectsHook.getState().importProject(zipFile());

    const names = useDashboardProjectsHook.getState().projects.map((p) => p.name);
    expect(names).toEqual(["Thesis", "Old"]);
  });

  it("keeps the names of files it could not import", async () => {
    respondWithApi(201, {
      success: true,
      data: imported({ skipped: ["Makefile", "notes.docx"] }),
    });

    await useDashboardProjectsHook.getState().importProject(zipFile());

    expect(useDashboardProjectsHook.getState().skippedFiles).toEqual([
      "Makefile",
      "notes.docx",
    ]);
  });

  it("surfaces the backend's reason for a refusal", async () => {
    // The specific reason is the useful part: "password-protected" tells the
    // user what to do, "import failed" does not.
    respondWithApi(400, {
      success: false,
      message: "Archive is password-protected: 'secret.tex'.",
    });

    const projectId = await useDashboardProjectsHook.getState().importProject(zipFile());

    expect(projectId).toBeNull();
    const state = useDashboardProjectsHook.getState();
    expect(state.createStatus).toBe("error");
    expect(state.errorMessage).toContain("password-protected");
    expect(state.projects).toEqual([]);
  });

  it("clears the previous skip list when a new import starts", async () => {
    useDashboardProjectsHook.setState({ skippedFiles: ["stale.txt"] });
    respondWithApi(400, { success: false, message: "That file is not a readable zip archive." });

    await useDashboardProjectsHook.getState().importProject(zipFile());

    expect(useDashboardProjectsHook.getState().skippedFiles).toEqual([]);
  });
});
