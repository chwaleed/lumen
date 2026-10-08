import { AlertTriangle, FileText, Loader2 } from "lucide-react";

type PreviewEmptyStateProps = {
  isBusy: boolean;
  hasFailed?: boolean;
  // True when a failure banner above already gives the reason, so this does
  // not repeat it -- or promise a log that a build which never ran has not got.
  reasonShownAbove?: boolean;
};

export function PreviewEmptyState({
  isBusy,
  hasFailed = false,
  reasonShownAbove = false,
}: PreviewEmptyStateProps) {
  // A failed build with no PDF and no parsed problems. "No preview yet" reads
  // as "you have not compiled", which is the opposite of what happened.
  if (hasFailed && !isBusy) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/30 p-8 text-center">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="text-sm font-medium text-foreground">The build did not finish</p>
        {!reasonShownAbove && (
          <p className="max-w-xs text-xs text-muted-foreground">
            Nothing was produced. The Log tab has the compiler&apos;s full output.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/30 p-8 text-center">
      {isBusy ? (
        <Loader2 className="size-8 animate-spin text-primary" />
      ) : (
        <FileText className="size-8 text-muted-foreground" />
      )}
      <p className="text-sm font-medium text-foreground">
        {isBusy ? "Building your document" : "No preview yet"}
      </p>
      <p className="max-w-xs text-xs text-muted-foreground">
        {isBusy
          ? "A first build takes longer while references and the bibliography settle."
          : "Press Compile to build this project and see the PDF here."}
      </p>
    </div>
  );
}
