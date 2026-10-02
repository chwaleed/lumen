"use client";

import { Download, Moon, Play, Save, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
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

  const isDarkMode = theme === "dark";

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

          <PanelLayoutPopover />

          <ProfileMenu />
        </div>
      </header>
    </TooltipProvider>
  );
}
