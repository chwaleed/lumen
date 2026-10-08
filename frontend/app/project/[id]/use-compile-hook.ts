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
  failure_reason: string | null;
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

/**
 * How long to keep polling before giving up on a build entirely.
 *
 * The server settles an abandoned job on read, so this should never fire --
 * but "should never" is how the spinner ran for ever in the first place. It
 * is the client's own backstop for a server that stops answering sensibly.
 * Exported so tests can shorten it.
 */
export const POLL_DEADLINE_MS = { value: 15 * 60 * 1000 };

// A dropped request is not a failed build. Wi-Fi blips, a dev server
// restarts; giving up on the first one threw away a compile that was fine.
const MAX_CONSECUTIVE_POLL_FAILURES = 4;

export type PreviewView = "pdf" | "problems" | "log";

export type CompileDiagnostic = {
  severity: "error" | "warning";
  message: string;
  file: string | null;
  line: number | null;
  // The source TeX echoed back, marked where it stopped reading.
  context: string | null;
};

type CompileState = {
  jobId: number | null;
  status: CompileStatus;
  errorCount: number | null;
  durationMs: number | null;
  hasPdf: boolean;
  message: string | null;
  log: string | null;
  errors: CompileDiagnostic[];
  warnings: CompileDiagnostic[];
  // Which pane the preview shows. `null` means "follow the compile": the PDF
  // when there is one, the problem list when the build failed.
  view: PreviewView | null;
  compile: (projectId: string) => Promise<void>;
  cancel: (projectId: string) => Promise<void>;
  loadLog: (projectId: string) => Promise<void>;
  setView: (view: PreviewView | null) => void;
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
  errors: [],
  warnings: [],
  view: null,

  compile: async (projectId: string) => {
    const current = get().status;
    if (current === "queued" || current === "running") {
      return;
    }

    set({
      status: "queued",
      message: null,
      log: null,
      errors: [],
      warnings: [],
      errorCount: null,
      hasPdf: false,
      view: null,
    });

    const { payload } = await requestApi<CompileJob>(`/api/projects/${projectId}/compile`, {
      method: "POST",
    });

    if (!payload.success || !payload.data) {
      set({ status: "failure", message: payload.message ?? "Could not start the compile." });
      return;
    }

    const jobId = payload.data.id;
    set({ jobId, status: payload.data.status });

    const deadline = Date.now() + POLL_DEADLINE_MS.value;
    let consecutiveFailures = 0;

    for (let attempt = 0; ; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, pollDelay(attempt)));

      // A newer compile started, or the view was reset: stop polling this one.
      if (get().jobId !== jobId) {
        return;
      }

      if (Date.now() > deadline) {
        set({
          status: "failure",
          message:
            "Gave up waiting for this build. It may still be running -- reload " +
            "the page to pick it up, or start a new compile.",
        });
        return;
      }

      const poll = await requestApi<CompileJob>(
        `/api/projects/${projectId}/compile/${jobId}`
      );

      if (!poll.payload.success || !poll.payload.data) {
        consecutiveFailures += 1;
        // A 404 means the job is gone for good; retrying cannot help.
        const isGone = poll.status === 404;
        if (isGone || consecutiveFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
          set({
            status: "failure",
            message:
              poll.payload.message ??
              "Lost contact with the build service while waiting for this compile.",
          });
          return;
        }
        continue;
      }

      consecutiveFailures = 0;
      const job = poll.payload.data;
      set({
        status: job.status,
        errorCount: job.error_count,
        durationMs: job.duration_ms,
        hasPdf: job.has_pdf,
        message: job.failure_reason,
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

    const { payload } = await requestApi<{
      log: string;
      error_count: number | null;
      errors: CompileDiagnostic[];
      warnings: CompileDiagnostic[];
    }>(`/api/projects/${projectId}/compile/${jobId}/log`);

    set({
      log: payload.data?.log ?? "",
      errors: payload.data?.errors ?? [],
      warnings: payload.data?.warnings ?? [],
      errorCount: payload.data?.error_count ?? get().errorCount,
    });
  },

  setView: (view: PreviewView | null) => set({ view }),

  reset: () =>
    set({
      jobId: null,
      status: "idle",
      errorCount: null,
      durationMs: null,
      hasPdf: false,
      message: null,
      log: null,
      errors: [],
      warnings: [],
      view: null,
    }),
}));
