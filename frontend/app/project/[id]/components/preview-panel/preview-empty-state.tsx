import { FileText, Loader2 } from "lucide-react";

type PreviewEmptyStateProps = {
  isBusy: boolean;
};

export function PreviewEmptyState({ isBusy }: PreviewEmptyStateProps) {
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
