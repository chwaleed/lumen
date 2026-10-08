"use client";

import { Download, Loader2, Moon, Play, Save, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCompileHook } from "@/app/project/[id]/use-compile-hook";
import { useProjectEditorHook } from "@/app/project/[id]/use-project-editor-hook";
import { useThemeStore } from "@/lib/stores/theme-store";
import { exportBaseName } from "@/lib/projects";
import { CompileStatus, PreviewTabs } from "./compile-controls";
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
  const projectName = useProjectEditorHook((state) => state.projectName);

  const isDarkMode = theme === "dark";
  const isCompiling = compileStatus === "queued" || compileStatus === "running";
  const pdfHref =
    projectId && compileJobId !== null && hasPdf
      ? `/api/projects/${projectId}/compile/${compileJobId}/pdf`
      : null;
  // An explicit filename: the route serves the PDF inline so the preview can
  // render it, which leaves a bare `download` to fall back on the URL's last
  // segment -- saving the file as "pdf", with no extension.
  const pdfFileName = `${exportBaseName(projectName)}.pdf`;

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

        {/* Ordered the way the work flows: how the last build went, the button
            that starts the next one, what it produced, then saving and
            exporting. */}
        <div className="flex items-center gap-2">
          <CompileStatus />

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

          <PreviewTabs />

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

          <TooltipAction
            label={pdfHref ? "Download the compiled PDF" : "Compile the project first"}
          >
            {/* Two buttons rather than one with a conditional child. Button is
                inline-flex with a gap between its direct children, so wrapping
                the icon and label in a <span> made them a single flex child --
                the icon then baseline-aligned against the text instead of
                centring, which is why this only looked wrong before a compile.

                A download rather than a fetch: the browser saves the bytes the
                proxy route already serves, so nothing is held in memory. */}
            {pdfHref ? (
              <Button asChild variant="default" size="sm" className="hidden sm:inline-flex">
                <a href={pdfHref} download={pdfFileName}>
                  <Download data-icon="inline-start" />
                  Export PDF
                </a>
              </Button>
            ) : (
              <Button variant="default" size="sm" className="hidden sm:inline-flex" disabled>
                <Download data-icon="inline-start" />
                Export PDF
              </Button>
            )}
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
