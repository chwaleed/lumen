"use client";

import type { editor as MonacoEditor } from "monaco-editor";
import { PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/lib/stores/theme-store";
import { EditorFileTabs } from "@/app/project/[id]/components/editor-file-tabs";
import { FloatingAiChat } from "@/app/project/[id]/components/floating-ai-chat";
import { MonacoLatexEditor } from "@/app/project/[id]/components/monaco-latex-editor";
import { SelectionActionPopup } from "@/app/project/[id]/components/selection-action-popup";
import { useProjectEditorHook, type EditorFile } from "@/app/project/[id]/use-project-editor-hook";
import type { EditorSelection } from "./use-editor-selection";

type EditorPanelProps = {
  activeFile: EditorFile | null;
  activeFileContent: string;
  activeFileIsImage: boolean;
  selection: EditorSelection;
  onEditorMount: (editor: MonacoEditor.IStandaloneCodeEditor) => void;
};

function EditorPanelBody({
  activeFile,
  activeFileContent,
  activeFileIsImage,
  onEditorMount,
}: Omit<EditorPanelProps, "selection">) {
  const theme = useThemeStore((state) => state.theme);
  const wordWrap = useProjectEditorHook((state) => state.wordWrap);
  const projectStatus = useProjectEditorHook((state) => state.projectStatus);
  const projectErrorMessage = useProjectEditorHook((state) => state.projectErrorMessage);

  if (activeFile && activeFileIsImage) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-muted/10 p-6">
        {activeFile.fileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeFile.fileUrl}
            alt={activeFile.name}
            className="max-h-full max-w-full rounded-md border border-border bg-background object-contain shadow-sm"
          />
        ) : (
          <p className="rounded-md border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            Image preview unavailable.
          </p>
        )}
      </div>
    );
  }

  if (activeFile) {
    return (
      <div className="min-h-0 flex-1 overflow-hidden">
        <MonacoLatexEditor
          value={activeFileContent}
          isDarkMode={theme === "dark"}
          wordWrap={wordWrap}
          onMount={onEditorMount}
        />
      </div>
    );
  }

  if (projectStatus === "loading") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading project...
      </div>
    );
  }

  if (projectErrorMessage) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {projectErrorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
      No file open. Select a file from the sidebar.
    </div>
  );
}

function EditorPanelTabs({ onInteract }: { onInteract: () => void }) {
  const openFiles = useProjectEditorHook((state) => state.openFiles);
  const activeFileId = useProjectEditorHook((state) => state.activeFileId);
  const sidebarOpen = useProjectEditorHook((state) => state.sidebarOpen);
  const setSidebarOpen = useProjectEditorHook((state) => state.setSidebarOpen);
  const setActiveFile = useProjectEditorHook((state) => state.setActiveFile);
  const closeFile = useProjectEditorHook((state) => state.closeFile);

  return (
    <div className="flex items-center border-b bg-muted/20">
      <div className="flex min-w-0 flex-1 items-center">
        {!sidebarOpen ? (
          <Button
            variant="ghost"
            size="icon"
            className="ml-2 size-8 shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        ) : null}

        {/* No trailing spacer: it claimed flex-1 too, so the tab strip only
            ever got half the editor's width and started scrolling at half the
            tabs it could actually hold. */}
        <EditorFileTabs
          files={openFiles}
          activeFileId={activeFileId}
          onSelectFile={(fileId) => {
            onInteract();
            setActiveFile(fileId);
          }}
          onCloseFile={(fileId) => {
            onInteract();
            closeFile(fileId);
          }}
        />
      </div>
    </div>
  );
}

function EditorPanelAiChat() {
  const isAiChatExpanded = useProjectEditorHook((state) => state.isAiChatExpanded);
  const aiChatPrompt = useProjectEditorHook((state) => state.aiChatPrompt);
  const aiChatHistory = useProjectEditorHook((state) => state.aiChatHistory);
  const setAiChatExpanded = useProjectEditorHook((state) => state.setAiChatExpanded);
  const setAiChatPrompt = useProjectEditorHook((state) => state.setAiChatPrompt);
  const submitAiChatPrompt = useProjectEditorHook((state) => state.submitAiChatPrompt);

  return (
    <FloatingAiChat
      expanded={isAiChatExpanded}
      prompt={aiChatPrompt}
      history={aiChatHistory}
      onExpand={() => setAiChatExpanded(true)}
      onCollapse={() => setAiChatExpanded(false)}
      onPromptChange={setAiChatPrompt}
      onSubmit={submitAiChatPrompt}
      onHistorySelect={setAiChatPrompt}
    />
  );
}

export function EditorPanel({ selection, ...bodyProps }: EditorPanelProps) {
  return (
    <div className="relative flex h-full min-h-0 flex-col bg-background">
      <EditorPanelTabs onInteract={selection.clear} />

      <EditorPanelBody {...bodyProps} />

      <SelectionActionPopup
        popup={selection.popup}
        prompt={selection.prompt}
        setPrompt={selection.setPrompt}
        onSubmitPrompt={selection.submitPrompt}
        onSelectAction={selection.runAction}
      />

      <EditorPanelAiChat />
    </div>
  );
}
