import { Badge } from "@/components/ui/badge";
import type { CompileStatus } from "@/app/project/[id]/use-compile-hook";

type CompileStatusBadgeProps = {
  status: CompileStatus;
  errorCount: number | null;
  durationMs: number | null;
};

// Only semantic tokens: destructive for failures, primary for in-flight,
// muted for everything else.
const TONE: Record<CompileStatus, string> = {
  idle: "bg-muted text-muted-foreground",
  queued: "bg-primary/10 text-primary",
  running: "bg-primary/10 text-primary",
  success: "bg-primary/10 text-primary",
  failure: "bg-destructive/10 text-destructive",
  timeout: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

function label(status: CompileStatus, errorCount: number | null, durationMs: number | null) {
  switch (status) {
    case "idle":
      return "Not compiled";
    case "queued":
      return "Queued";
    case "running":
      return "Compiling";
    case "success":
      return durationMs === null ? "Compiled" : `Compiled in ${(durationMs / 1000).toFixed(1)}s`;
    case "failure":
      return errorCount ? `${errorCount} error${errorCount === 1 ? "" : "s"}` : "Failed";
    case "timeout":
      return "Timed out";
    case "cancelled":
      return "Cancelled";
  }
}

export function CompileStatusBadge({
  status,
  errorCount,
  durationMs,
}: CompileStatusBadgeProps) {
  return (
    <Badge variant="secondary" className={`text-[10px] ${TONE[status]}`}>
      {label(status, errorCount, durationMs)}
    </Badge>
  );
}
