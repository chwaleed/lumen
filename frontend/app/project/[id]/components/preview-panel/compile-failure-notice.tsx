import { AlertTriangle } from "lucide-react";

type CompileFailureNoticeProps = {
  reason: string;
  hasPdf: boolean;
};

/**
 * Why a build failed, in a sentence, above whatever the pane is showing.
 *
 * Reserved for failures the log cannot explain: a project with no .tex, a
 * figure that could not be read, a worker that died, a job nothing picked up.
 * Those used to surface as a red badge over an empty problem list, which told
 * the user precisely nothing.
 */
export function CompileFailureNotice({ reason, hasPdf }: CompileFailureNoticeProps) {
  return (
    <div className="flex shrink-0 items-start gap-2 border-b border-destructive/30 bg-destructive/10 px-3 py-2">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="min-w-0 space-y-1">
        <p className="text-xs leading-relaxed text-destructive">{reason}</p>
        {hasPdf && (
          // The PDF is from this same failed run, so it is missing whatever
          // the failure dropped. Saying so beats letting it look current.
          <p className="text-[11px] text-muted-foreground">
            A PDF was still produced, but it may be incomplete.
          </p>
        )}
      </div>
    </div>
  );
}
