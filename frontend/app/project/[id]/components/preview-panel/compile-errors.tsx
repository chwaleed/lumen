import { AlertCircle, AlertTriangle, FileWarning } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CompileDiagnostic } from "@/app/project/[id]/use-compile-hook";

type CompileErrorsProps = {
  errors: CompileDiagnostic[];
  warnings: CompileDiagnostic[];
  onSelect: (diagnostic: CompileDiagnostic) => void;
};

function DiagnosticRow({
  diagnostic,
  onSelect,
}: {
  diagnostic: CompileDiagnostic;
  onSelect: (diagnostic: CompileDiagnostic) => void;
}) {
  const isError = diagnostic.severity === "error";
  const canNavigate = Boolean(diagnostic.file);
  const location = diagnostic.file
    ? `${diagnostic.file}${diagnostic.line === null ? "" : `:${diagnostic.line}`}`
    : diagnostic.line === null
      ? "location unknown"
      : `line ${diagnostic.line}`;

  return (
    <button
      type="button"
      disabled={!canNavigate}
      onClick={() => onSelect(diagnostic)}
      className="flex w-full items-start gap-2 border-b border-border px-3 py-2 text-left transition-colors hover:bg-muted/60 disabled:cursor-default disabled:hover:bg-transparent"
    >
      {isError ? (
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
      ) : (
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block break-words text-xs text-foreground">{diagnostic.message}</span>
        <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
          {location}
        </span>
        {diagnostic.context ? (
          // What TeX had read when it stopped, with the break point marked.
          // "Missing $ inserted." on line 6 is a riddle without it.
          <span className="mt-1 block overflow-x-auto rounded bg-muted/60 px-2 py-1 font-mono text-[10px] whitespace-pre text-muted-foreground">
            {diagnostic.context}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function CompileErrors({ errors, warnings, onSelect }: CompileErrorsProps) {
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <FileWarning className="size-7 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">No diagnostics</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          The compiler reported nothing it could place. The full log is still available.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full w-full">
      {/* Errors first: after follow-on suppression the first one is what broke
          the build. Warnings follow, because an undefined reference is not why
          a document failed to compile. */}
      {errors.map((diagnostic, index) => (
        <DiagnosticRow key={`error-${index}`} diagnostic={diagnostic} onSelect={onSelect} />
      ))}
      {warnings.length > 0 && (
        <p className="bg-muted/40 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {warnings.length} warning{warnings.length === 1 ? "" : "s"}
        </p>
      )}
      {warnings.map((diagnostic, index) => (
        <DiagnosticRow key={`warning-${index}`} diagnostic={diagnostic} onSelect={onSelect} />
      ))}
    </ScrollArea>
  );
}
