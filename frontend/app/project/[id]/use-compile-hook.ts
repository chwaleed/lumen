"use client";

import { create } from "zustand";
import { requestApi } from "@/lib/http/client";

/**
 * Compile state for the project route.
 *
 * Deliberately a separate store from `use-project-editor-hook`, which is already
 * 895 lines: compilation has its own lifecycle (queue, poll, settle) and nothing
 * in it needs the editor's file or tab state.
 */

export type CompileStatus =
  | "idle"
  | "queued"
  | "running"
  | "success"
  | "failure"
  | "timeout"
  | "cancelled";

type CompileJob = {
  id: number;
  status: Exclude<CompileStatus, "idle">;
  engine: string;
  exit_code: number | null;
  duration_ms: number | null;
  error_count: number | null;
  has_pdf: boolean;
  has_log: boolean;
};

const TERMINAL: CompileStatus[] = ["success", "failure", "timeout", "cancelled"];

// Poll quickly while a build is plausibly nearly done, then back off. A cold
// thesis build measured ~36s, so a fixed fast interval would be mostly wasted
// requests. See docs/plans/latex-compilation.md.
// Exported so tests can shorten it; production never mutates it.
export const POLL_BACKOFF_MS = [400, 600, 900, 1400, 2000, 3000];

function pollDelay(attempt: number) {
  return POLL_BACKOFF_MS[Math.min(attempt, POLL_BACKOFF_MS.length - 1)];
}

type CompileState = {
  jobId: number | null;
  status: CompileStatus;
  errorCount: number | null;
  durationMs: number | null;
  hasPdf: boolean;
  message: string | null;
  log: string | null;
  isLogOpen: boolean;
  compile: (projectId: string) => Promise<void>;
  cancel: (projectId: string) => Promise<void>;
  loadLog: (projectId: string) => Promise<void>;
  setLogOpen: (open: boolean) => void;
  reset: () => void;
};

export const useCompileHook = create<CompileState>()((set, get) => ({
  jobId: null,
  status: "idle",
  errorCount: null,
  durationMs: null,
  hasPdf: false,
  message: null,
  log: null,
  isLogOpen: false,

  compile: async (projectId: string) => {
    const current = get().status;
    if (current === "queued" || current === "running") {
      return;
    }

    set({ status: "queued", message: null, log: null, errorCount: null, hasPdf: false });

    const { payload } = await requestApi<CompileJob>(`/api/projects/${projectId}/compile`, {
      method: "POST",
    });

    if (!payload.success || !payload.data) {
      set({ status: "failure", message: payload.message ?? "Could not start the compile." });
      return;
    }

    const jobId = payload.data.id;
    set({ jobId, status: payload.data.status });

    for (let attempt = 0; ; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, pollDelay(attempt)));

      // A newer compile started, or the view was reset: stop polling this one.
      if (get().jobId !== jobId) {
        return;
      }

      const poll = await requestApi<CompileJob>(
        `/api/projects/${projectId}/compile/${jobId}`
      );

      if (!poll.payload.success || !poll.payload.data) {
        set({ status: "failure", message: poll.payload.message ?? "Lost track of the compile." });
        return;
      }

      const job = poll.payload.data;
      set({
        status: job.status,
        errorCount: job.error_count,
        durationMs: job.duration_ms,
        hasPdf: job.has_pdf,
      });

      if (TERMINAL.includes(job.status)) {
        if (job.status !== "success") {
          await get().loadLog(projectId);
        }
        return;
      }
    }
  },

  cancel: async (projectId: string) => {
    const jobId = get().jobId;
    if (jobId === null) {
      return;
    }

    const { payload } = await requestApi<CompileJob>(
      `/api/projects/${projectId}/compile/${jobId}`,
      { method: "DELETE" }
    );

    set({
      status: payload.data?.status ?? get().status,
      message: payload.success ? null : payload.message,
    });
  },

  loadLog: async (projectId: string) => {
    const jobId = get().jobId;
    if (jobId === null) {
      return;
    }

    const { payload } = await requestApi<{ log: string; error_count: number | null }>(
      `/api/projects/${projectId}/compile/${jobId}/log`
    );

    set({
      log: payload.data?.log ?? "",
      errorCount: payload.data?.error_count ?? get().errorCount,
    });
  },

  setLogOpen: (open: boolean) => set({ isLogOpen: open }),

  reset: () =>
    set({
      jobId: null,
      status: "idle",
      errorCount: null,
      durationMs: null,
      hasPdf: false,
      message: null,
      log: null,
      isLogOpen: false,
    }),
}));
