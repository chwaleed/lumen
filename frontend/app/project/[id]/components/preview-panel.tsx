import { Badge } from "@/components/ui/badge";

type PreviewPanelProps = {
  latexCode: string;
};

export function PreviewPanel({ latexCode }: PreviewPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2">
        <span className="text-sm font-medium">Preview</span>
        <Badge variant="secondary" className="text-[10px]">
          Auto-compile On
        </Badge>
      </div>

      <div className="flex flex-1 justify-center overflow-auto bg-muted p-4 md:p-8">
        <div className="w-full max-w-[820px] bg-background p-6 text-foreground shadow-xl md:p-12">
          <pre className="whitespace-pre-wrap font-mono text-sm leading-6">{latexCode}</pre>
        </div>
      </div>
    </div>
  );
}
