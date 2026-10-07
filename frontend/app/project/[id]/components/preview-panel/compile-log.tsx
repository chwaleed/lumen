import { ScrollArea } from "@/components/ui/scroll-area";

type CompileLogProps = {
  log: string;
};

export function CompileLog({ log }: CompileLogProps) {
  return (
    <ScrollArea className="h-full w-full bg-muted/30">
      {/* Raw engine output. Parsed file/line errors are M5; until then showing
          the log verbatim beats guessing at which line is at fault. */}
      <pre className="whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-foreground">
        {log.trim() || "The compiler produced no output."}
      </pre>
    </ScrollArea>
  );
}
