"use client";

import { AlertCircle, ScrollText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompileHook, type PreviewView } from "@/app/project/[id]/use-compile-hook";
import { useProjectEditorHook } from "@/app/project/[id]/use-project-editor-hook";
import { CompileStatusBadge } from "./compile-status";
import { TooltipAction } from "./tooltip-action";

/**
 * Compile status, and a cancel while one is running.
 *
 * This and `PreviewTabs` used to be a header strip above the preview, which
 * cost the PDF ~40px of height and put a second Compile button a few
 * centimetres from the one in this bar. They sit either side of the Compile
 * button now: the status reads into it, the tabs read out of it.
 */
export function CompileStatus() {
  const projectId = useProjectEditorHook((state) => state.projectId);
  const status = useCompileHook((state) => state.status);
  const errorCount = useCompileHook((state) => state.errorCount);
  const durationMs = useCompileHook((state) => state.durationMs);
  const cancel = useCompileHook((state) => state.cancel);

  const isBusy = status === "queued" || status === "running";

  return (
    <div className="flex items-center gap-1">
      <CompileStatusBadge status={status} errorCount={errorCount} durationMs={durationMs} />
      {isBusy && (
        <TooltipAction label="Stop this compile">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => projectId && void cancel(projectId)}
          >
            <X data-icon="inline-start" />
            Cancel
          </Button>
        </TooltipAction>
      )}
    </div>
  );
}

/**
 * Switches the preview between the problem list, the log, and the PDF.
 *
 * There is no PDF tab. The PDF is what the pane shows by default, so a chip
 * for it would be lit almost always and do nothing when pressed. These toggle
 * instead: pressing the active one clears the choice and the pane falls back
 * to the PDF.
 */
export function PreviewTabs() {
  const projectId = useProjectEditorHook((state) => state.projectId);
  const log = useCompileHook((state) => state.log);
  const errors = useCompileHook((state) => state.errors);
  const warnings = useCompileHook((state) => state.warnings);
  const hasPdf = useCompileHook((state) => state.hasPdf);
  const jobId = useCompileHook((state) => state.jobId);
  const status = useCompileHook((state) => state.status);
  const view = useCompileHook((state) => state.view);
  const setView = useCompileHook((state) => state.setView);
  const loadLog = useCompileHook((state) => state.loadLog);

  const problemCount = errors.length + warnings.length;
  const hasPreview = jobId !== null && hasPdf;
  // Available after any finished build, not just a failed one: a successful
  // compile still reports overfull boxes and undefined references, and the
  // store only fetches the log on failure -- so clicking fetches it.
  const hasFinished =
    jobId !== null && status !== "idle" && status !== "queued" && status !== "running";

  // Mirrors the preview's own fallback: with no explicit choice, follow the
  // compile -- the PDF when there is one, the problems when the build failed.
  const activeView: PreviewView | null =
    view ?? (hasPreview ? "pdf" : problemCount > 0 ? "problems" : null);

  const tabs = [
    {
      view: "problems" as const,
      label: String(problemCount),
      tooltip: `Show ${problemCount} problem${problemCount === 1 ? "" : "s"}`,
      icon: AlertCircle,
      shown: problemCount > 0,
    },
    {
      view: "log" as const,
      label: "Log",
      tooltip: "Show the compiler log",
      icon: ScrollText,
      shown: hasFinished,
    },
  ].filter((tab) => tab.shown);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {tabs.map((tab) => {
        const isActive = activeView === tab.view;
        return (
          <TooltipAction key={tab.view} label={isActive ? "Back to the PDF" : tab.tooltip}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={async () => {
                if (isActive) {
                  setView(null);
                  return;
                }
                if (tab.view === "log" && log === null && projectId) {
                  await loadLog(projectId);
                }
                setView(tab.view);
              }}
            >
              <tab.icon data-icon="inline-start" />
              {tab.label}
            </Button>
          </TooltipAction>
        );
      })}
    </div>
  );
}
