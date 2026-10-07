"use client";

import { AlertCircle, FileText, Play, ScrollText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useCompileHook,
  type CompileDiagnostic,
  type PreviewView,
} from "@/app/project/[id]/use-compile-hook";
import { useProjectEditorHook } from "@/app/project/[id]/use-project-editor-hook";
import { CompileErrors } from "./compile-errors";
import { CompileLog } from "./compile-log";
import { CompileStatusBadge } from "./compile-status";
import { PdfViewer } from "./pdf-viewer";
import { PreviewEmptyState } from "./preview-empty-state";
import { revealDiagnostic } from "./reveal-diagnostic";

export function PreviewPanel() {
  const projectId = useProjectEditorHook((state) => state.projectId);

  const jobId = useCompileHook((state) => state.jobId);
  const status = useCompileHook((state) => state.status);
  const errorCount = useCompileHook((state) => state.errorCount);
  const durationMs = useCompileHook((state) => state.durationMs);
  const hasPdf = useCompileHook((state) => state.hasPdf);
  const log = useCompileHook((state) => state.log);
  const errors = useCompileHook((state) => state.errors);
  const warnings = useCompileHook((state) => state.warnings);
  const view = useCompileHook((state) => state.view);
  const compile = useCompileHook((state) => state.compile);
  const cancel = useCompileHook((state) => state.cancel);
  const setView = useCompileHook((state) => state.setView);

  const isBusy = status === "queued" || status === "running";
  const problemCount = errors.length + warnings.length;
  const pdfSrc =
    projectId && jobId !== null && hasPdf
      ? `/api/projects/${projectId}/compile/${jobId}/pdf`
      : null;

  // With no explicit choice, follow the compile: the PDF when there is one,
  // the problems when the build failed.
  const activeView: PreviewView | null =
    view ?? (pdfSrc ? "pdf" : problemCount > 0 ? "problems" : null);

  const onSelect = (diagnostic: CompileDiagnostic) => {
    revealDiagnostic(diagnostic);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/20 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Preview</span>
          <CompileStatusBadge status={status} errorCount={errorCount} durationMs={durationMs} />
        </div>

        <div className="flex items-center gap-1">
          {problemCount > 0 && (
            <Button
              variant={activeView === "problems" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setView("problems")}
            >
              <AlertCircle data-icon="inline-start" />
              {problemCount}
            </Button>
          )}
          {pdfSrc && (
            <Button
              variant={activeView === "pdf" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setView("pdf")}
            >
              <FileText data-icon="inline-start" />
              PDF
            </Button>
          )}
          {log !== null && (
            <Button
              variant={activeView === "log" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setView("log")}
            >
              <ScrollText data-icon="inline-start" />
              Log
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
        {activeView === "problems" ? (
          <CompileErrors errors={errors} warnings={warnings} onSelect={onSelect} />
        ) : activeView === "log" && log !== null ? (
          <CompileLog log={log} />
        ) : activeView === "pdf" && pdfSrc ? (
          <PdfViewer src={pdfSrc} title="Compiled PDF preview" />
        ) : (
          <PreviewEmptyState isBusy={isBusy} />
        )}
      </div>
    </div>
  );
}
