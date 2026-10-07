"use client";

import { Download, Loader2, Moon, Play, Save, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCompileHook } from "@/app/project/[id]/use-compile-hook";
import { useProjectEditorHook } from "@/app/project/[id]/use-project-editor-hook";
import { useThemeStore } from "@/lib/stores/theme-store";
import { PanelLayoutPopover } from "./panel-layout-popover";
import { ProfileMenu } from "./profile-menu";
import { TooltipAction } from "./tooltip-action";
import { TopBarMenus } from "./top-bar-menus";

export function EditorTopBar() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const saveActiveFile = useProjectEditorHook((state) => state.saveActiveFile);
  const projectId = useProjectEditorHook((state) => state.projectId);

  const compile = useCompileHook((state) => state.compile);
  const compileStatus = useCompileHook((state) => state.status);
  const compileJobId = useCompileHook((state) => state.jobId);
  const hasPdf = useCompileHook((state) => state.hasPdf);

  const isDarkMode = theme === "dark";
  const isCompiling = compileStatus === "queued" || compileStatus === "running";
  const pdfHref =
    projectId && compileJobId !== null && hasPdf
      ? `/api/projects/${projectId}/compile/${compileJobId}/pdf`
      : null;

  return (
    <TooltipProvider>
      <header className="flex h-14 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-5" />
            <span className="text-lg font-semibold tracking-tight">TexAI</span>
          </div>

          <TopBarMenus />
        </div>

        <div className="flex items-center gap-2">
          <TooltipAction label="Save file">
            <Button
              variant="secondary"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => void saveActiveFile()}
            >
              <Save data-icon="inline-start" />
              Save
            </Button>
          </TooltipAction>
          <TooltipAction label={isCompiling ? "Compiling…" : "Compile document"}>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              disabled={isCompiling || !projectId}
              onClick={() => projectId && void compile(projectId)}
            >
              {isCompiling ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Play data-icon="inline-start" />
              )}
              {isCompiling ? "Compiling" : "Compile"}
            </Button>
          </TooltipAction>
          <TooltipAction
            label={pdfHref ? "Download the compiled PDF" : "Compile the project first"}
          >
            {/* A download rather than a fetch: the browser saves the bytes the
                proxy route already serves, so there is nothing to hold in memory. */}
            <Button
              asChild={Boolean(pdfHref)}
              variant="default"
              size="sm"
              className="hidden sm:inline-flex"
              disabled={!pdfHref}
            >
              {pdfHref ? (
                <a href={pdfHref} download>
                  <Download data-icon="inline-start" />
                  Export PDF
                </a>
              ) : (
                <span>
                  <Download data-icon="inline-start" />
                  Export PDF
                </span>
              )}
            </Button>
          </TooltipAction>

          <TooltipAction label={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}>
            <Button variant="ghost" size="icon" onClick={() => setTheme(isDarkMode ? "light" : "dark")}>
              {isDarkMode ? <Sun /> : <Moon />}
            </Button>
          </TooltipAction>

          <PanelLayoutPopover />

          <ProfileMenu />
        </div>
      </header>
    </TooltipProvider>
  );
}
