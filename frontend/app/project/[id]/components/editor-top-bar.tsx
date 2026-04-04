"use client";

import type { ReactNode } from "react";
import { Code, Columns, Download, FileText, Moon, PanelLeft, Play, Sparkles, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProjectEditorHook } from "@/app/project/[id]/use-project-editor-hook";
import { useThemeStore } from "@/lib/stores/theme-store";

type TooltipActionProps = {
  label: string;
  children: ReactNode;
};

function TooltipAction({ label, children }: TooltipActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export function EditorTopBar() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const sidebarOpen = useProjectEditorHook((state) => state.sidebarOpen);
  const editorOpen = useProjectEditorHook((state) => state.editorOpen);
  const previewOpen = useProjectEditorHook((state) => state.previewOpen);
  const wordWrap = useProjectEditorHook((state) => state.wordWrap);

  const setSidebarOpen = useProjectEditorHook((state) => state.setSidebarOpen);
  const setEditorOpen = useProjectEditorHook((state) => state.setEditorOpen);
  const setPreviewOpen = useProjectEditorHook((state) => state.setPreviewOpen);
  const toggleWordWrap = useProjectEditorHook((state) => state.toggleWordWrap);
  const createUntitledFile = useProjectEditorHook((state) => state.createUntitledFile);
  const saveActiveFile = useProjectEditorHook((state) => state.saveActiveFile);
  const cutSelection = useProjectEditorHook((state) => state.cutSelection);
  const copySelection = useProjectEditorHook((state) => state.copySelection);
  const pasteSelection = useProjectEditorHook((state) => state.pasteSelection);
  const insertSnippet = useProjectEditorHook((state) => state.insertSnippet);

  const isDarkMode = theme === "dark";
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

  const handleSidebarToggle = (checked: boolean) => {
    setSidebarOpen(checked);
  };

  const openEditorOnly = () => {
    if (!editorOpen) {
      setEditorOpen(true);
    }
    if (previewOpen) {
      setPreviewOpen(false);
    }
  };

  const openPreviewOnly = () => {
    if (!previewOpen) {
      setPreviewOpen(true);
    }
    if (editorOpen) {
      setEditorOpen(false);
    }
  };

  return (
    <TooltipProvider>
      <header className="flex h-14 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-5" />
            <span className="text-lg font-semibold tracking-tight">TexAI</span>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            <DropdownMenu>
              <TooltipAction label="File actions">
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    File
                  </Button>
                </DropdownMenuTrigger>
              </TooltipAction>
              <DropdownMenuContent align="start">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={createUntitledFile}>
                    New File
                    <DropdownMenuShortcut>Ctrl+N</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={saveActiveFile}>
                    Save
                    <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <TooltipAction label="Edit actions">
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </DropdownMenuTrigger>
              </TooltipAction>
              <DropdownMenuContent align="start">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => void cutSelection()}>
                    Cut
                    <DropdownMenuShortcut>Ctrl+X</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void copySelection()}>
                    Copy
                    <DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void pasteSelection()}>
                    Paste
                    <DropdownMenuShortcut>Ctrl+V</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <TooltipAction label="View options">
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </DropdownMenuTrigger>
              </TooltipAction>
              <DropdownMenuContent align="start">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setTheme(isDarkMode ? "light" : "dark")}>Toggle Theme</DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleWordWrap}>
                    {wordWrap ? "Disable Word Wrap" : "Enable Word Wrap"}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <TooltipAction label="Insert snippets">
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    Insert
                  </Button>
                </DropdownMenuTrigger>
              </TooltipAction>
              <DropdownMenuContent align="start">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => insertSnippet("\\begin{equation}\n  \n\\end{equation}")}>
                    Equation
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      insertSnippet(
                        "\\begin{figure}[h]\n  \\centering\n  \\includegraphics[width=0.5\\textwidth]{image.png}\n  \\caption{Caption here}\n  \\label{fig:label}\n\\end{figure}",
                      )
                    }
                  >
                    Figure
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      insertSnippet(
                        "\\begin{table}[h]\n  \\centering\n  \\begin{tabular}{|c|c|}\n    \\hline\n    Header 1 & Header 2 \\\\\n    \\hline\n    Data 1 & Data 2 \\\\\n    \\hline\n  \\end{tabular}\n  \\caption{Caption here}\n  \\label{tab:label}\n\\end{table}",
                      )
                    }
                  >
                    Table
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => insertSnippet("\\begin{itemize}\n  \\item \n\\end{itemize}")}>
                    Itemize
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertSnippet("\\begin{enumerate}\n  \\item \n\\end{enumerate}")}>
                    Enumerate
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <TooltipAction label="Compile document">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex">
              <Play data-icon="inline-start" />
              Compile
            </Button>
          </TooltipAction>
          <TooltipAction label="Export as PDF">
            <Button variant="default" size="sm" className="hidden sm:inline-flex">
              <Download data-icon="inline-start" />
              Export PDF
            </Button>
          </TooltipAction>

          <TooltipAction label={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}>
            <Button variant="ghost" size="icon" onClick={() => setTheme(isDarkMode ? "light" : "dark")}>
              {isDarkMode ? <Sun /> : <Moon />}
            </Button>
          </TooltipAction>

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
                    onClick={openEditorOnly}
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
                    onClick={openPreviewOnly}
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
                  <Switch checked={sidebarOpen} onCheckedChange={handleSidebarToggle} />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <TooltipAction label="Profile menu">
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full p-0">
                  <Avatar className="size-8">
                    <AvatarImage src="" alt="Profile avatar" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
            </TooltipAction>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <User data-icon="inline-start" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem variant="destructive">Sign out</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  );
}
