import { Folder, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SidebarTab } from "@/app/project/[id]/use-project-editor-hook";

type ActivityBarProps = {
  activeSidebarTab: SidebarTab;
  sidebarOpen: boolean;
  setActiveSidebarTab: (tab: SidebarTab) => void;
  setSidebarOpen: (open: boolean) => void;
};

export function ActivityBar({ activeSidebarTab, sidebarOpen, setActiveSidebarTab, setSidebarOpen }: ActivityBarProps) {
  const handleTabClick = (tab: SidebarTab) => {
    setActiveSidebarTab(tab);
    if (!sidebarOpen) {
      setSidebarOpen(true);
    }
  };

  return (
    <div className="hidden w-14 shrink-0 flex-col items-center gap-4 border-r bg-muted/20 py-4 md:flex">
      <Button
        variant={activeSidebarTab === "files" && sidebarOpen ? "secondary" : "ghost"}
        size="icon"
        className="rounded-xl"
        onClick={() => handleTabClick("files")}
      >
        <Folder className="size-5" />
      </Button>

      <Button
        variant={activeSidebarTab === "search" && sidebarOpen ? "secondary" : "ghost"}
        size="icon"
        className="rounded-xl"
        onClick={() => handleTabClick("search")}
      >
        <Search className="size-5" />
      </Button>

      <Button
        variant={activeSidebarTab === "ai" && sidebarOpen ? "secondary" : "ghost"}
        size="icon"
        className="rounded-xl"
        onClick={() => handleTabClick("ai")}
      >
        <Sparkles className="size-5" />
      </Button>
    </div>
  );
}
