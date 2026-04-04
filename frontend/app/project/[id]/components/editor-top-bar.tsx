import { Columns, Moon, PanelLeft, Play, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type EditorTopBarProps = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  sidebarOpen: boolean;
  editorOpen: boolean;
  previewOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setEditorOpen: (open: boolean) => void;
  setPreviewOpen: (open: boolean) => void;
};

export function EditorTopBar({
  isDarkMode,
  toggleTheme,
  sidebarOpen,
  editorOpen,
  previewOpen,
  setSidebarOpen,
  setEditorOpen,
  setPreviewOpen,
}: EditorTopBarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="size-5" />
        <span className="text-lg font-semibold tracking-tight">TexAI</span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="hidden sm:inline-flex">
          <Play data-icon="inline-start" />
          Compile
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDarkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Columns className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Panels</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={editorOpen} onCheckedChange={setEditorOpen}>
              Editor
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={previewOpen} onCheckedChange={setPreviewOpen}>
              Preview
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={sidebarOpen} onCheckedChange={setSidebarOpen}>
              <PanelLeft data-icon="inline-start" />
              Sidebar
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
