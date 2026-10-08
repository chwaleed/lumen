import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { SidebarHeader } from "./sidebar-header";

type SidebarAiTabProps = {
  onCloseSidebar: () => void;
};

export function SidebarAiTab({ onCloseSidebar }: SidebarAiTabProps) {
  return (
    <div className="flex flex-col h-full">
      <SidebarHeader
        title={<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Assistant</h2>}
        onClose={onCloseSidebar}
      />
      <ScrollArea className="min-h-0 flex-1 p-4">
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <div className="bg-primary/10 p-2 rounded-full">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">TexAI</span>
            </div>
            <div className="bg-muted p-3 rounded-lg text-sm rounded-tl-none">
              Hello! I can help you write LaTeX, fix errors, or format equations. What do you need help with?
            </div>
          </div>

          <div className="flex flex-col space-y-2 items-end">
            <div className="bg-primary text-primary-foreground p-3 rounded-lg text-sm rounded-tr-none">
              Can you create a complex table for my data?
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <div className="bg-primary/10 p-2 rounded-full">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">TexAI</span>
            </div>
            <div className="bg-muted p-3 rounded-lg text-sm rounded-tl-none space-y-2">
              <p>
                Sure! Here&apos;s a template for a professional-looking table using the <code>booktabs</code> package:
              </p>
              <div className="bg-background p-2 rounded border font-mono text-xs overflow-x-auto">
                \begin{"{table}"}[htbp]
                <br />
                \centering
                <br />
                \begin{"{tabular}"}{"{llr}"}
                <br />
                \toprule
                <br />
                Item & Description & Cost \\
                <br />
                \midrule
                <br />
                1 & Apple & $1.00 \\
                <br />
                2 & Banana & $0.50 \\
                <br />
                \bottomrule
                <br />
                \end{"{tabular}"}
                <br />
                \caption{"{Sample Table}"}
                <br />
                \end{"{table}"}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-2">
                Insert at Cursor
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-3 border-t bg-background">
        <div className="relative">
          <Textarea
            placeholder="Ask AI to write or fix LaTeX..."
            className="min-h-[80px] resize-none pr-10 text-sm"
          />
          <Button size="icon" className="absolute bottom-2 right-2 h-8 w-8 rounded-full">
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
