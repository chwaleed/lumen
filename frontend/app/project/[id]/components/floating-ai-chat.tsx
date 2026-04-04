import { ArrowUp, History, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type FloatingAiChatProps = {
  expanded: boolean;
  prompt: string;
  history: string[];
  onExpand: () => void;
  onCollapse: () => void;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  onHistorySelect: (value: string) => void;
};

export function FloatingAiChat({
  expanded,
  prompt,
  history,
  onExpand,
  onCollapse,
  onPromptChange,
  onSubmit,
  onHistorySelect,
}: FloatingAiChatProps) {
  return (
    <div
      className={`absolute bottom-6 right-6 z-20 overflow-hidden shadow-lg transition-all duration-300 ${
        expanded
          ? "h-14 w-[calc(100%-3rem)] rounded-2xl border bg-background md:w-[450px]"
          : "size-12 rounded-full"
      }`}
    >
      {!expanded ? (
        <Button size="icon" className="size-12 rounded-full" onClick={onExpand}>
          <Sparkles className="size-5" />
        </Button>
      ) : (
        <div className="flex h-full items-center gap-2 px-2">
          <Sparkles className="ml-2 size-5 text-primary" />
          <input
            autoFocus
            type="text"
            placeholder="Ask AI to edit or chat with doc..."
            className="flex-1 bg-transparent text-sm outline-none"
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSubmit();
              }
            }}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 rounded-full" disabled={history.length === 0}>
                <History className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Prompt History</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {history.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">No history yet</div>
                ) : (
                  history.map((item, index) => (
                    <DropdownMenuItem key={`${item}-${index}`} onClick={() => onHistorySelect(item)}>
                      <span className="truncate">{item}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="icon" className="size-8 rounded-full" onClick={onSubmit}>
            <ArrowUp className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={onCollapse}>
            <X className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
