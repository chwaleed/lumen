import { beforeEach, describe, expect, it } from "bun:test";
import {
  resetAxiosMock,
  respondInOrderWithApi,
  respondWithApi,
  axiosRequest,
} from "../support/axios-mock";
import { POLL_BACKOFF_MS, useCompileHook } from "@/app/project/[id]/use-compile-hook";

const ORIGINAL_BACKOFF = [...POLL_BACKOFF_MS];

function job(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    status: "queued",
    engine: "pdflatex",
    exit_code: null,
    duration_ms: null,
    error_count: null,
    has_pdf: false,
    has_log: false,
    ...overrides,
  };
}

describe("useCompileHook", () => {
  beforeEach(() => {
    resetAxiosMock();
    useCompileHook.getState().reset();
    // Keep the suite fast: the real backoff starts at 400ms.
    POLL_BACKOFF_MS.splice(0, POLL_BACKOFF_MS.length, ...ORIGINAL_BACKOFF.map(() => 1));
  });

  it("polls a queued job through to success", async () => {
    respondInOrderWithApi([
      { status: 202, success: true, data: job({ status: "queued" }) },
      { status: 200, success: true, data: job({ status: "running" }) },
      {
        status: 200,
        success: true,
        data: job({ status: "success", has_pdf: true, duration_ms: 1418, error_count: 0 }),
      },
    ]);

    await useCompileHook.getState().compile("1");

    const state = useCompileHook.getState();
    expect(state.status).toBe("success");
    expect(state.jobId).toBe(7);
    expect(state.hasPdf).toBe(true);
    expect(state.durationMs).toBe(1418);
  });

  it("loads the log when a compile fails", async () => {
    respondInOrderWithApi([
      { status: 202, success: true, data: job({ status: "queued" }) },
      { status: 200, success: true, data: job({ status: "failure", error_count: 2 }) },
      { status: 200, success: true, data: { log: "./main.tex:4: Missing $ inserted.", error_count: 2 } },
    ]);

    await useCompileHook.getState().compile("1");

    const state = useCompileHook.getState();
    expect(state.status).toBe("failure");
    expect(state.errorCount).toBe(2);
    expect(state.log).toContain("Missing $ inserted");
  });

  it("does not fetch the log on success", async () => {
    respondInOrderWithApi([
      { status: 202, success: true, data: job({ status: "queued" }) },
      { status: 200, success: true, data: job({ status: "success", has_pdf: true }) },
    ]);

    await useCompileHook.getState().compile("1");

    // POST + one poll, and nothing more.
    expect(axiosRequest.mock.calls.length).toBe(2);
    expect(useCompileHook.getState().log).toBeNull();
  });

  it("ignores a second compile while one is already in flight", async () => {
    respondInOrderWithApi([
      { status: 202, success: true, data: job({ status: "queued" }) },
      { status: 200, success: true, data: job({ status: "success", has_pdf: true }) },
    ]);

    const first = useCompileHook.getState().compile("1");
    await useCompileHook.getState().compile("1");
    await first;

    expect(axiosRequest.mock.calls.length).toBe(2);
  });

  it("reports a refused submission rather than polling forever", async () => {
    respondWithApi(500, { success: false, message: "Compile queue unavailable.", data: null });

    await useCompileHook.getState().compile("1");

    const state = useCompileHook.getState();
    expect(state.status).toBe("failure");
    expect(state.message).toBe("Compile queue unavailable.");
    expect(state.jobId).toBeNull();
  });

  it("stops polling a job that a newer compile superseded", async () => {
    respondInOrderWithApi([
      { status: 202, success: true, data: job({ id: 7, status: "queued" }) },
      { status: 200, success: true, data: job({ id: 7, status: "running" }) },
    ]);

    const inFlight = useCompileHook.getState().compile("1");

    // Wait for the POST to land before superseding, so this exercises the poll
    // loop's own guard rather than a race with the submission.
    await new Promise<void>((resolve) => {
      const unsubscribe = useCompileHook.subscribe((state) => {
        if (state.jobId === 7) {
          unsubscribe();
          resolve();
        }
      });
    });
    useCompileHook.setState({ jobId: 99 });
    await inFlight;

    // The loop saw a different job id and abandoned its own, leaving the newer
    // one untouched rather than writing a stale status over it.
    expect(useCompileHook.getState().jobId).toBe(99);
    expect(useCompileHook.getState().status).not.toBe("success");
  });

  it("cancels a queued job", async () => {
    useCompileHook.setState({ jobId: 7, status: "queued" });
    respondWithApi(200, { success: true, data: job({ status: "cancelled" }) });

    await useCompileHook.getState().cancel("1");

    expect(useCompileHook.getState().status).toBe("cancelled");
  });

  it("keeps the current status when cancelling is refused", async () => {
    useCompileHook.setState({ jobId: 7, status: "running" });
    respondWithApi(409, {
      success: false,
      message: "Only a queued compile can be cancelled; this one is running.",
      data: null,
    });

    await useCompileHook.getState().cancel("1");

    const state = useCompileHook.getState();
    expect(state.status).toBe("running");
    expect(state.message).toContain("Only a queued compile");
  });

  it("does nothing when there is no job to cancel", async () => {
    await useCompileHook.getState().cancel("1");
    expect(axiosRequest.mock.calls.length).toBe(0);
  });
});
