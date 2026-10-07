"use client";

import { FileText, Play, ScrollText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompileHook } from "@/app/project/[id]/use-compile-hook";
import { useProjectEditorHook } from "@/app/project/[id]/use-project-editor-hook";
import { CompileLog } from "./compile-log";
import { CompileStatusBadge } from "./compile-status";
import { PdfViewer } from "./pdf-viewer";
import { PreviewEmptyState } from "./preview-empty-state";

export function PreviewPanel() {
  const projectId = useProjectEditorHook((state) => state.projectId);

  const jobId = useCompileHook((state) => state.jobId);
  const status = useCompileHook((state) => state.status);
  const errorCount = useCompileHook((state) => state.errorCount);
  const durationMs = useCompileHook((state) => state.durationMs);
  const hasPdf = useCompileHook((state) => state.hasPdf);
  const log = useCompileHook((state) => state.log);
  const isLogOpen = useCompileHook((state) => state.isLogOpen);
  const compile = useCompileHook((state) => state.compile);
  const cancel = useCompileHook((state) => state.cancel);
  const setLogOpen = useCompileHook((state) => state.setLogOpen);

  const isBusy = status === "queued" || status === "running";
  const showLog = isLogOpen || (!hasPdf && log !== null);
  const pdfSrc =
    projectId && jobId !== null && hasPdf
      ? `/api/projects/${projectId}/compile/${jobId}/pdf`
      : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/20 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Preview</span>
          <CompileStatusBadge status={status} errorCount={errorCount} durationMs={durationMs} />
        </div>

        <div className="flex items-center gap-1">
          {log !== null && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setLogOpen(!isLogOpen)}
            >
              {isLogOpen ? <FileText data-icon="inline-start" /> : <ScrollText data-icon="inline-start" />}
              {isLogOpen ? "PDF" : "Log"}
            </Button>
          )}

          {isBusy ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => projectId && void cancel(projectId)}
            >
              <X data-icon="inline-start" />
              Cancel
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => projectId && void compile(projectId)}
            >
              <Play data-icon="inline-start" />
              Compile
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {showLog && log !== null ? (
          <CompileLog log={log} />
        ) : pdfSrc ? (
          <PdfViewer src={pdfSrc} title="Compiled PDF preview" />
        ) : (
          <PreviewEmptyState isBusy={isBusy} />
        )}
      </div>
    </div>
  );
}
