import { ArrowUp, Eye, RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SelectionPopupState = {
  show: boolean;
  x: number;
  y: number;
  text: string;
};

type SelectionAction = "Proof read" | "Rewrite" | "Improve";

type SelectionActionPopupProps = {
  popup: SelectionPopupState;
  prompt: string;
  setPrompt: (value: string) => void;
  onSubmitPrompt: () => void;
  onSelectAction: (action: SelectionAction) => void;
};

export function SelectionActionPopup({
  popup,
  prompt,
  setPrompt,
  onSubmitPrompt,
  onSelectAction,
}: SelectionActionPopupProps) {
  if (!popup.show) {
    return null;
  }

  return (
    <div
      className="fixed z-30 w-64 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl"
      style={{ top: popup.y, left: popup.x }}
    >
      <div className="border-b border-border/50 bg-muted/30 p-2">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Enter prompt"
            className="h-8 w-full bg-transparent pr-8 text-sm outline-none"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSubmitPrompt();
              }
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-0 size-8 text-muted-foreground hover:text-foreground"
            onClick={onSubmitPrompt}
          >
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-0.5 p-1">
        <Button
          variant="ghost"
          className="h-9 justify-start px-2 text-sm font-normal text-muted-foreground hover:text-foreground"
          onClick={() => onSelectAction("Proof read")}
        >
          <Eye className="mr-2 size-4" />
          Proof read
        </Button>
        <Button
          variant="ghost"
          className="h-9 justify-start px-2 text-sm font-normal text-muted-foreground hover:text-foreground"
          onClick={() => onSelectAction("Rewrite")}
        >
          <RefreshCw className="mr-2 size-4" />
          Rewrite
        </Button>
        <Button
          variant="ghost"
          className="h-9 justify-start px-2 text-sm font-normal text-muted-foreground hover:text-foreground"
          onClick={() => onSelectAction("Improve")}
        >
          <Wand2 className="mr-2 size-4" />
          Improve
        </Button>
      </div>
    </div>
  );
}
