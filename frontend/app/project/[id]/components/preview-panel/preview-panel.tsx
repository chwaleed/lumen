"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useCompileHook,
  type CompileDiagnostic,
  type PreviewView,
} from "@/app/project/[id]/use-compile-hook";
import { useProjectEditorHook } from "@/app/project/[id]/use-project-editor-hook";
import { CompileErrors } from "./compile-errors";
import { CompileLog } from "./compile-log";
import { PdfViewer } from "./pdf-viewer";
import { PreviewEmptyState } from "./preview-empty-state";
import { revealDiagnostic } from "./reveal-diagnostic";

/**
 * The preview pane: a PDF, a problem list, or a log, and nothing else.
 *
 * The status badge and the view switcher live in the top bar. A header strip
 * here would cost the PDF ~40px of height and would sit a few centimetres
 * below a Compile button that already exists up there.
 */
export function PreviewPanel() {
  const projectId = useProjectEditorHook((state) => state.projectId);

  const jobId = useCompileHook((state) => state.jobId);
  const status = useCompileHook((state) => state.status);
  const hasPdf = useCompileHook((state) => state.hasPdf);
  const log = useCompileHook((state) => state.log);
  const errors = useCompileHook((state) => state.errors);
  const warnings = useCompileHook((state) => state.warnings);
  const view = useCompileHook((state) => state.view);
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

  // Only while something other than the PDF is showing, and only when there
  // is a PDF to go back to. The top-bar chip toggles too, but nothing on this
  // pane said so once you were looking at a wall of log output.
  const canReturnToPdf = Boolean(pdfSrc) && activeView !== "pdf";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {canReturnToPdf && (
        <div className="flex shrink-0 items-center justify-end border-b bg-muted/20 px-2 py-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setView("pdf")}
          >
            <FileText data-icon="inline-start" />
            Back to PDF
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
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
