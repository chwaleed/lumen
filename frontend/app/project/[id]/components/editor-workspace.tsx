"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { editor as MonacoEditor } from "monaco-editor";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { PanelLeftOpen } from "lucide-react";
import { EditorSidebar } from "@/components/editor-sidebar";
import { useThemeStore } from "@/lib/stores/theme-store";
import { ActivityBar } from "@/app/project/[id]/components/activity-bar";
import { EditorTopBar } from "@/app/project/[id]/components/editor-top-bar";
import { PreviewPanel } from "@/app/project/[id]/components/preview-panel";
import { StatusBar } from "@/app/project/[id]/components/status-bar";
import { EditorFileTabs } from "@/app/project/[id]/components/editor-file-tabs";
import { FloatingAiChat } from "@/app/project/[id]/components/floating-ai-chat";
import { MonacoLatexEditor } from "@/app/project/[id]/components/monaco-latex-editor";
import {
  SelectionActionPopup,
  type SelectionPopupState,
} from "@/app/project/[id]/components/selection-action-popup";
import { useProjectEditorHook } from "@/app/project/[id]/use-project-editor-hook";
import { postApi } from "@/lib/http/client";

type EditorWorkspaceProps = {
  projectId: string;
};

type PendingSnapshotChange = {
  range_offset: number;
  range_length: number;
  text: string;
};

type PendingSnapshotBatch = {
  baseVersion: number | null;
  changes: PendingSnapshotChange[];
  timeoutId: number | null;
};

export function EditorWorkspace({ projectId }: EditorWorkspaceProps) {
  const router = useRouter();
  const theme = useThemeStore((state) => state.theme);
  const projectName = useProjectEditorHook((state) => state.projectName);
  const projectStatus = useProjectEditorHook((state) => state.projectStatus);
  const projectErrorMessage = useProjectEditorHook((state) => state.projectErrorMessage);
  const filesTree = useProjectEditorHook((state) => state.filesTree);

  const activeSidebarTab = useProjectEditorHook((state) => state.activeSidebarTab);
  const sidebarOpen = useProjectEditorHook((state) => state.sidebarOpen);
  const editorOpen = useProjectEditorHook((state) => state.editorOpen);
  const previewOpen = useProjectEditorHook((state) => state.previewOpen);
  const openFiles = useProjectEditorHook((state) => state.openFiles);
  const activeFileId = useProjectEditorHook((state) => state.activeFileId);
  const fileContents = useProjectEditorHook((state) => state.fileContents);
  const setActiveSidebarTab = useProjectEditorHook((state) => state.setActiveSidebarTab);
  const setSidebarOpen = useProjectEditorHook((state) => state.setSidebarOpen);
  const setEditorInstance = useProjectEditorHook((state) => state.setEditorInstance);
  const wordWrap = useProjectEditorHook((state) => state.wordWrap);
  const isAiChatExpanded = useProjectEditorHook((state) => state.isAiChatExpanded);
  const aiChatPrompt = useProjectEditorHook((state) => state.aiChatPrompt);
  const aiChatHistory = useProjectEditorHook((state) => state.aiChatHistory);
  const setAiChatExpanded = useProjectEditorHook((state) => state.setAiChatExpanded);
  const setAiChatPrompt = useProjectEditorHook((state) => state.setAiChatPrompt);
  const submitAiChatPrompt = useProjectEditorHook((state) => state.submitAiChatPrompt);
  const initializeForViewport = useProjectEditorHook((state) => state.initializeForViewport);
  const loadProject = useProjectEditorHook((state) => state.loadProject);
  const openFile = useProjectEditorHook((state) => state.openFile);
  const createEntry = useProjectEditorHook((state) => state.createEntry);
  const renameProject = useProjectEditorHook((state) => state.renameProject);
  const renameEntry = useProjectEditorHook((state) => state.renameEntry);
  const deleteEntry = useProjectEditorHook((state) => state.deleteEntry);
  const closeFile = useProjectEditorHook((state) => state.closeFile);
  const setActiveFile = useProjectEditorHook((state) => state.setActiveFile);

  const [isMobile, setIsMobile] = useState(false);
  const [panelContainerWidth, setPanelContainerWidth] = useState(0);
  const [selectionPopup, setSelectionPopup] = useState<SelectionPopupState>({
    show: false,
    x: 0,
    y: 0,
    text: "",
  });
  const [selectionPrompt, setSelectionPrompt] = useState("");

  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const panelContainerRef = useRef<HTMLDivElement | null>(null);
  const findWidgetObserverRef = useRef<MutationObserver | null>(null);
  const isPointerSelectingRef = useRef(false);
  const isContentSelectionRef = useRef(false);
  const pendingSnapshotBatchesRef = useRef<Map<string, PendingSnapshotBatch>>(new Map());

  useEffect(() => {
    void loadProject(projectId);
  }, [loadProject, projectId]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const sync = () => {
      const mobile = media.matches;
      setIsMobile(mobile);
      initializeForViewport(mobile);
    };

    sync();
    media.addEventListener("change", sync);

    return () => {
      media.removeEventListener("change", sync);
    };
  }, [initializeForViewport]);

  useEffect(() => {
    const element = panelContainerRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (!entry) {
        return;
      }
      setPanelContainerWidth(entry.contentRect.width);
    });

    observer.observe(element);
    setPanelContainerWidth(element.getBoundingClientRect().width);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const pendingSnapshotBatches = pendingSnapshotBatchesRef.current;

    return () => {
      setEditorInstance(null);
      findWidgetObserverRef.current?.disconnect();
      findWidgetObserverRef.current = null;
      pendingSnapshotBatches.forEach((batch) => {
        if (batch.timeoutId !== null) {
          window.clearTimeout(batch.timeoutId);
        }
      });
      pendingSnapshotBatches.clear();
    };
  }, [setEditorInstance]);

  const activeFile = useMemo(() => openFiles.find((file) => file.id === activeFileId) ?? null, [activeFileId, openFiles]);
  const activeFileContent = activeFileId ? fileContents[activeFileId] ?? "" : "";

  const isDarkMode = theme === "dark";
  const previewSize = useMemo(() => (sidebarOpen ? 40 : 50), [sidebarOpen]);
  const panelMinWidths = useMemo(() => {
    if (panelContainerWidth >= 1400) {
      return { editor: 480, preview: 450 };
    }
    if (panelContainerWidth >= 1200) {
      return { editor: 440, preview: 410 };
    }
    if (panelContainerWidth >= 1024) {
      return { editor: 400, preview: 360 };
    }
    return { editor: 340, preview: 300 };
  }, [panelContainerWidth]);
  const panelMaxWidths = useMemo(() => {
    if (panelContainerWidth <= 0) {
      return {
        editor: undefined,
        preview: undefined,
      } as const;
    }

    return {
      editor: Math.max(panelMinWidths.editor, panelContainerWidth - panelMinWidths.preview),
      preview: Math.max(panelMinWidths.preview, panelContainerWidth - panelMinWidths.editor),
    } as const;
  }, [panelContainerWidth, panelMinWidths.editor, panelMinWidths.preview]);

  const SELECTION_POPUP_WIDTH = 256;
  const SELECTION_POPUP_HEIGHT = 150;
  const VIEWPORT_MARGIN = 8;

  const clearSelectionPopup = () => {
    setSelectionPopup((prev) => ({ ...prev, show: false }));
  };

  const flushSnapshotBatch = async (fileId: string) => {
    const batch = pendingSnapshotBatchesRef.current.get(fileId);
    if (!batch || batch.changes.length === 0) {
      return;
    }

    pendingSnapshotBatchesRef.current.delete(fileId);

    const { status, payload } = await postApi<{
      content: string;
      version: number;
    }>(`/api/projects/${projectId}/files/${fileId}/snapshots`, {
        base_version: batch.baseVersion,
        changes: batch.changes,
    });

    if (status < 200 || status >= 300 || !payload.success || !payload.data) {
      return;
    }

    useProjectEditorHook.getState().setFileContent(fileId, payload.data.content);
    useProjectEditorHook.getState().setFileSnapshotVersion(fileId, payload.data.version);
  };

  const queueSnapshotChange = (fileId: string, change: PendingSnapshotChange) => {
    const batch = pendingSnapshotBatchesRef.current.get(fileId);

    if (!batch) {
      const currentSnapshotVersions = useProjectEditorHook.getState().snapshotVersions;
      const nextBatch: PendingSnapshotBatch = {
        baseVersion: currentSnapshotVersions[fileId] ?? null,
        changes: [change],
        timeoutId: window.setTimeout(() => {
          void flushSnapshotBatch(fileId);
        }, 500),
      };
      pendingSnapshotBatchesRef.current.set(fileId, nextBatch);
      return;
    }

    if (batch.timeoutId !== null) {
      window.clearTimeout(batch.timeoutId);
    }

    batch.changes.push(change);
    batch.timeoutId = window.setTimeout(() => {
      void flushSnapshotBatch(fileId);
    }, 500);
  };

  const showSelectionPopup = (editor: MonacoEditor.IStandaloneCodeEditor) => {
    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) {
      clearSelectionPopup();
      return;
    }

    const selectedText = editor.getModel()?.getValueInRange(selection) ?? "";
    const position = editor.getScrolledVisiblePosition(selection.getEndPosition());
    const domNode = editor.getDomNode();

    if (!position || !domNode || !selectedText.trim()) {
      clearSelectionPopup();
      return;
    }

    const rect = domNode.getBoundingClientRect();
    const anchorX = rect.left + position.left;
    const anchorY = rect.top + position.top;
    const editorSafeTop = rect.top + 56;

    const left = Math.min(
      Math.max(anchorX, VIEWPORT_MARGIN),
      window.innerWidth - SELECTION_POPUP_WIDTH - VIEWPORT_MARGIN,
    );

    const topAbove = anchorY - SELECTION_POPUP_HEIGHT - VIEWPORT_MARGIN;
    const topBelow = anchorY + VIEWPORT_MARGIN;
    const top = topAbove >= editorSafeTop ? topAbove : topBelow;
    const clampedTop = Math.min(
      Math.max(top, editorSafeTop),
      window.innerHeight - SELECTION_POPUP_HEIGHT - VIEWPORT_MARGIN,
    );

    setSelectionPopup({ show: true, x: left, y: clampedTop, text: selectedText });
  };

  const handleEditorMount = (editor: MonacoEditor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    setEditorInstance(editor);

    const stripFindWidgetTooltips = () => {
      document
        .querySelectorAll(
          ".monaco-editor .find-widget [title], .monaco-editor .find-widget [data-title], .monaco-editor .find-widget [data-tooltip], .monaco-editor .find-widget [aria-label]",
        )
        .forEach((element) => {
          element.removeAttribute("title");
          element.removeAttribute("data-title");
          element.removeAttribute("data-tooltip");
          element.removeAttribute("aria-label");
        });
    };

    stripFindWidgetTooltips();
    findWidgetObserverRef.current?.disconnect();
    const observer = new MutationObserver(() => {
      stripFindWidgetTooltips();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["title", "data-title", "data-tooltip", "aria-label"],
    });
    findWidgetObserverRef.current = observer;

    editor.onDidChangeModelContent((event) => {
      const currentFileId = useProjectEditorHook.getState().activeFileId;
      if (!currentFileId || event.isFlush) {
        return;
      }

      const currentValue = editor.getValue();
      useProjectEditorHook.getState().setFileContent(currentFileId, currentValue);

      for (const change of event.changes) {
        queueSnapshotChange(currentFileId, {
          range_offset: change.rangeOffset,
          range_length: change.rangeLength,
          text: change.text,
        });
      }
    });

    editor.onMouseDown((event) => {
      // Monaco overlay widgets (find/replace, context menus, etc.) should not trigger AI selection popup.
      const targetType = event.target.type as number;
      const isContentTarget = targetType === 6 || targetType === 7; // CONTENT_TEXT or CONTENT_EMPTY
      isPointerSelectingRef.current = isContentTarget;
      isContentSelectionRef.current = isContentTarget;
      if (isContentTarget) {
        clearSelectionPopup();
      }
    });

    editor.onMouseUp(() => {
      if (!isPointerSelectingRef.current || !isContentSelectionRef.current) {
        isPointerSelectingRef.current = false;
        isContentSelectionRef.current = false;
        return;
      }

      isPointerSelectingRef.current = false;
      isContentSelectionRef.current = false;
      showSelectionPopup(editor);
    });
  };

  const handleSelectionAction = (action: "Proof read" | "Rewrite" | "Improve") => {
    if (!selectionPopup.text.trim()) {
      return;
    }

    const prefix =
      action === "Proof read"
        ? "Proof read this selection:\n"
        : action === "Rewrite"
          ? "Rewrite this selection:\n"
          : "Improve this selection:\n";

    setAiChatPrompt(`${prefix}${selectionPopup.text}`);
    setAiChatExpanded(true);
    clearSelectionPopup();
  };

  const handleSelectionPromptSubmit = () => {
    if (!selectionPopup.text.trim()) {
      return;
    }

    const prompt = selectionPrompt.trim();
    if (!prompt) {
      return;
    }

    setAiChatPrompt(`${prompt}\n\nSelected text:\n${selectionPopup.text}`);
    setAiChatExpanded(true);
    setSelectionPrompt("");
    clearSelectionPopup();
  };

  return (
    <div className="flex h-dvh overflow-hidden flex-col bg-background text-foreground">
      <EditorTopBar />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ActivityBar
          activeSidebarTab={activeSidebarTab}
          sidebarOpen={sidebarOpen}
          setActiveSidebarTab={setActiveSidebarTab}
          setSidebarOpen={setSidebarOpen}
        />

        {isMobile && sidebarOpen ? (
          <div className="absolute inset-0 z-10 bg-background/70" onClick={() => setSidebarOpen(false)} />
        ) : null}

        <EditorSidebar
          activeSidebarTab={activeSidebarTab}
          sidebarOpen={sidebarOpen}
          projectName={projectName}
          files={filesTree}
          setSidebarOpen={setSidebarOpen}
          onOpenFile={(fileId, fileName) => {
            clearSelectionPopup();
            openFile(fileId, fileName);
          }}
          onCreateEntry={async (parentId, type) => {
            clearSelectionPopup();
            await createEntry(parentId, type);
          }}
          onRenameEntry={async (entryId, name) => {
            clearSelectionPopup();
            return renameEntry(entryId, name);
          }}
          onDeleteEntry={async (entryId) => {
            clearSelectionPopup();
            return deleteEntry(entryId);
          }}
          onRenameProject={async (name) => {
            clearSelectionPopup();
            return renameProject(name);
          }}
        />

        <div ref={panelContainerRef} className="min-w-0 flex-1 overflow-hidden">
          <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"} className="h-full w-full">
            {editorOpen ? (
              <ResizablePanel
                defaultSize={previewOpen ? 60 : 100}
                minSize={!isMobile && previewOpen ? panelMinWidths.editor : 20}
                maxSize={!isMobile && previewOpen ? panelMaxWidths.editor : undefined}
              >
                <div className="relative flex h-full min-h-0 flex-col bg-background">
                  <div className="flex items-center border-b bg-muted/20 overflow-x-auto">
                    <div className="flex min-w-0 flex-1 items-center">
                      {!sidebarOpen ? (
                        <Button variant="ghost" size="icon" className="ml-2 size-8 shrink-0" onClick={() => setSidebarOpen(true)}>
                          <PanelLeftOpen className="size-4" />
                        </Button>
                      ) : null}

                      <EditorFileTabs
                        files={openFiles}
                        activeFileId={activeFileId}
                        onSelectFile={(fileId) => {
                          clearSelectionPopup();
                          setActiveFile(fileId);
                        }}
                        onCloseFile={(fileId) => {
                          clearSelectionPopup();
                          closeFile(fileId);
                        }}
                      />

                      <div className="min-w-[20px] flex-1" />
                    </div>

                    <div className="shrink-0 px-4">
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => router.push("/dashboard")}>
                        Back
                      </Button>
                    </div>
                  </div>

                  {activeFile ? (
                    <div className="min-h-0 flex-1 overflow-hidden">
                      <MonacoLatexEditor
                        value={activeFileContent}
                        isDarkMode={isDarkMode}
                        wordWrap={wordWrap}
                        onMount={handleEditorMount}
                      />
                    </div>
                  ) : projectStatus === "loading" ? (
                    <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
                      Loading project...
                    </div>
                  ) : projectErrorMessage ? (
                    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
                      <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {projectErrorMessage}
                      </p>
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
                      No file open. Select a file from the sidebar.
                    </div>
                  )}

                  <SelectionActionPopup
                    popup={selectionPopup}
                    prompt={selectionPrompt}
                    setPrompt={setSelectionPrompt}
                    onSubmitPrompt={handleSelectionPromptSubmit}
                    onSelectAction={handleSelectionAction}
                  />

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
                </div>
              </ResizablePanel>
            ) : null}

            {editorOpen && previewOpen ? <ResizableHandle withHandle /> : null}

            {previewOpen ? (
              <ResizablePanel
                defaultSize={editorOpen ? previewSize : 100}
                minSize={!isMobile && editorOpen ? panelMinWidths.preview : 20}
                maxSize={!isMobile && editorOpen ? panelMaxWidths.preview : undefined}
              >
                <PreviewPanel latexCode={activeFileContent} />
              </ResizablePanel>
            ) : null}
          </ResizablePanelGroup>
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
