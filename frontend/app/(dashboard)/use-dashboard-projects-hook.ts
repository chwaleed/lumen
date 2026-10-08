"use client";

import { create } from "zustand";
import type { ProjectItem } from "@/app/(dashboard)/data/library-data";
import { postApi, requestApi } from "@/lib/http/client";

type BackendProject = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

type FetchStatus = "idle" | "loading" | "loaded" | "error";
type CreateStatus = "idle" | "submitting" | "error";

type CreateProjectOptions = {
  name?: string;
  templateId?: string;
};

type ImportedProject = {
  project: BackendProject;
  imported: string[];
  skipped: string[];
};

type DashboardProjectsState = {
  projects: ProjectItem[];
  fetchStatus: FetchStatus;
  createStatus: CreateStatus;
  errorMessage: string | null;
  // What the last import left behind: files in the zip we do not take. Held so
  // the dashboard can say which ones, rather than silently dropping them.
  skippedFiles: string[];
  // Set alongside skippedFiles so the notice can offer a way into the project
  // the user was not navigated to.
  lastImportedProjectId: string | null;
  ensureProjectsLoaded: () => Promise<void>;
  createProject: (options?: CreateProjectOptions) => Promise<string | null>;
  importProject: (file: File) => Promise<string | null>;
};

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, "day");
  }

  const diffWeeks = Math.round(diffDays / 7);
  if (Math.abs(diffWeeks) < 5) {
    return rtf.format(diffWeeks, "week");
  }

  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) {
    return rtf.format(diffMonths, "month");
  }

  const diffYears = Math.round(diffDays / 365);
  return rtf.format(diffYears, "year");
}

function mapProject(project: BackendProject): ProjectItem {
  return {
    id: String(project.id),
    name: project.name,
    updatedAt: formatRelativeTime(project.updated_at),
    tags: [],
  };
}

function getDefaultProjectName(templateId?: string) {
  if (!templateId || templateId === "blank") {
    return "Untitled Project";
  }

  return `${templateId.charAt(0).toUpperCase()}${templateId.slice(1)} Project`;
}

export const useDashboardProjectsHook = create<DashboardProjectsState>()((set, get) => ({
  projects: [],
  fetchStatus: "idle",
  createStatus: "idle",
  errorMessage: null,
  skippedFiles: [],
  lastImportedProjectId: null,
  ensureProjectsLoaded: async () => {
    const { fetchStatus } = get();
    if (fetchStatus === "loading" || fetchStatus === "loaded") {
      return;
    }

    set({ fetchStatus: "loading", errorMessage: null });

    const { status, payload } = await requestApi<BackendProject[]>("/api/projects");

    if (status < 200 || status >= 300 || !payload.success) {
      set({
        fetchStatus: "error",
        errorMessage: payload.message ?? "Unable to load projects right now.",
      });
      return;
    }

    set({
      projects: (payload.data ?? []).map(mapProject),
      fetchStatus: "loaded",
      errorMessage: null,
    });
  },
  createProject: async (options) => {
    set({ createStatus: "submitting", errorMessage: null });

    const { status, payload } = await postApi<BackendProject>("/api/projects", {
      name: options?.name ?? getDefaultProjectName(options?.templateId),
      template_id: options?.templateId,
    });

    if (status < 200 || status >= 300 || !payload.success || !payload.data) {
      set({
        createStatus: "error",
        errorMessage: payload.message ?? "Unable to create a project right now.",
      });
      return null;
    }

    set((state) => ({
      createStatus: "idle",
      errorMessage: null,
      fetchStatus: "loaded",
      projects: [mapProject(payload.data as BackendProject), ...state.projects],
    }));

    return String(payload.data.id);
  },
  importProject: async (file: File) => {
    set({
      createStatus: "submitting",
      errorMessage: null,
      skippedFiles: [],
      lastImportedProjectId: null,
    });

    // The File goes straight into the request body. FormData would mean a
    // multipart parser on the backend for this one endpoint, and the zip is
    // already exactly the bytes we want to send.
    const { status, payload } = await requestApi<ImportedProject>(
      `/api/projects/import?file_name=${encodeURIComponent(file.name)}`,
      {
        method: "POST",
        body: file,
        headers: { "Content-Type": "application/zip" },
      }
    );

    if (status < 200 || status >= 300 || !payload.success || !payload.data) {
      set({
        createStatus: "error",
        // The backend's message names the actual problem -- a password, a
        // traversal, a size -- and is more useful than anything generic.
        errorMessage: payload.message ?? "That archive could not be imported.",
      });
      return null;
    }

    const imported = payload.data;
    set((state) => ({
      createStatus: "idle",
      errorMessage: null,
      fetchStatus: "loaded",
      skippedFiles: imported.skipped,
      lastImportedProjectId: String(imported.project.id),
      projects: [mapProject(imported.project), ...state.projects],
    }));

    return String(imported.project.id);
  },
}));
