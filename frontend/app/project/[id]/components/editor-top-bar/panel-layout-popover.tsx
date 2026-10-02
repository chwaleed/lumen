"use client";

import { Code, Columns, FileText, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useProjectEditorHook } from "@/app/project/[id]/use-project-editor-hook";
import { TooltipAction } from "./tooltip-action";

export function PanelLayoutPopover() {
  const sidebarOpen = useProjectEditorHook((state) => state.sidebarOpen);
  const editorOpen = useProjectEditorHook((state) => state.editorOpen);
  const previewOpen = useProjectEditorHook((state) => state.previewOpen);
  const setSidebarOpen = useProjectEditorHook((state) => state.setSidebarOpen);
  const setEditorOpen = useProjectEditorHook((state) => state.setEditorOpen);
  const setPreviewOpen = useProjectEditorHook((state) => state.setPreviewOpen);

  // Refuse the toggle that would leave no panel visible at all.
  const handleEditorToggle = (checked: boolean) => {
    if (!checked && !previewOpen) {
      return;
    }
    setEditorOpen(checked);
  };

  const handlePreviewToggle = (checked: boolean) => {
    if (!checked && !editorOpen) {
      return;
    }
    setPreviewOpen(checked);
  };

  const showOnly = (panel: "editor" | "preview") => {
    setEditorOpen(panel === "editor");
    setPreviewOpen(panel === "preview");
  };

  return (
    <Popover>
      <TooltipAction label="Panel layout">
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon">
            <Columns />
          </Button>
        </PopoverTrigger>
      </TooltipAction>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => showOnly("editor")}
            >
              <Code className="size-4" />
              <span>Code</span>
            </button>
            <Switch checked={editorOpen} onCheckedChange={handleEditorToggle} />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => showOnly("preview")}
            >
              <FileText className="size-4" />
              <span>PDF</span>
            </button>
            <Switch checked={previewOpen} onCheckedChange={handlePreviewToggle} />
          </div>
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <PanelLeft className="size-4" />
              <span>Sidebar</span>
            </div>
            <Switch checked={sidebarOpen} onCheckedChange={setSidebarOpen} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
