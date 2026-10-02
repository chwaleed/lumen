"use client";

import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjectEditorHook } from "@/app/project/[id]/use-project-editor-hook";
import { useThemeStore } from "@/lib/stores/theme-store";
import { LATEX_SNIPPET_GROUPS } from "./latex-snippets";
import { TooltipAction } from "./tooltip-action";

type TopBarMenuProps = {
  label: string;
  tooltip: string;
  children: React.ReactNode;
};

function TopBarMenu({ label, tooltip, children }: TopBarMenuProps) {
  return (
    <DropdownMenu>
      <TooltipAction label={tooltip}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            {label}
          </Button>
        </DropdownMenuTrigger>
      </TooltipAction>
      <DropdownMenuContent align="start">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopBarMenus() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const wordWrap = useProjectEditorHook((state) => state.wordWrap);
  const toggleWordWrap = useProjectEditorHook((state) => state.toggleWordWrap);
  const createUntitledFile = useProjectEditorHook((state) => state.createUntitledFile);
  const saveActiveFile = useProjectEditorHook((state) => state.saveActiveFile);
  const cutSelection = useProjectEditorHook((state) => state.cutSelection);
  const copySelection = useProjectEditorHook((state) => state.copySelection);
  const pasteSelection = useProjectEditorHook((state) => state.pasteSelection);
  const insertSnippet = useProjectEditorHook((state) => state.insertSnippet);

  const isDarkMode = theme === "dark";

  return (
    <nav className="hidden items-center gap-1 md:flex">
      <TopBarMenu label="File" tooltip="File actions">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => void createUntitledFile()}>
            New File
            <DropdownMenuShortcut>Ctrl+N</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => void saveActiveFile()}>
            Save
            <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </TopBarMenu>

      <TopBarMenu label="Edit" tooltip="Edit actions">
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
      </TopBarMenu>

      <TopBarMenu label="View" tooltip="View options">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setTheme(isDarkMode ? "light" : "dark")}>
            Toggle Theme
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleWordWrap}>
            {wordWrap ? "Disable Word Wrap" : "Enable Word Wrap"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </TopBarMenu>

      <TopBarMenu label="Insert" tooltip="Insert snippets">
        {LATEX_SNIPPET_GROUPS.map((group, groupIndex) => (
          <Fragment key={group[0].label}>
            {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuGroup>
              {group.map((snippet) => (
                <DropdownMenuItem
                  key={snippet.label}
                  onClick={() => insertSnippet(snippet.body)}
                >
                  {snippet.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </Fragment>
        ))}
      </TopBarMenu>
    </nav>
  );
}
