"use client";

import { useEffect, useMemo } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { EditorSidebar } from "@/components/editor-sidebar";
import { ActivityBar } from "@/app/project/[id]/components/activity-bar";
import { EditorTopBar } from "@/app/project/[id]/components/editor-top-bar";
import { PreviewPanel } from "@/app/project/[id]/components/preview-panel";
import { StatusBar } from "@/app/project/[id]/components/status-bar";
import { useProjectEditorHook } from "@/app/project/[id]/use-project-editor-hook";
import { EditorPanel } from "./editor-panel";
import { useEditorMount } from "./use-editor-mount";
import { useEditorSelection } from "./use-editor-selection";
import { usePanelSizing } from "./use-panel-sizing";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];

function isImageFile(file: { name: string; mimeType?: string | null }) {
  const normalizedName = file.name.toLowerCase();

  return (
    file.mimeType?.startsWith("image/") ||
    IMAGE_EXTENSIONS.some((extension) => normalizedName.endsWith(extension))
  );
}

type EditorWorkspaceProps = {
  projectId: string;
};

export function EditorWorkspace({ projectId }: EditorWorkspaceProps) {
  const projectName = useProjectEditorHook((state) => state.projectName);
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
  const loadProject = useProjectEditorHook((state) => state.loadProject);
  const openFile = useProjectEditorHook((state) => state.openFile);
  const createEntry = useProjectEditorHook((state) => state.createEntry);
  const uploadFile = useProjectEditorHook((state) => state.uploadFile);
  const renameProject = useProjectEditorHook((state) => state.renameProject);
  const renameEntry = useProjectEditorHook((state) => state.renameEntry);
  const moveEntry = useProjectEditorHook((state) => state.moveEntry);
  const deleteEntry = useProjectEditorHook((state) => state.deleteEntry);

  const selection = useEditorSelection();
  const handleEditorMount = useEditorMount({
    onClearSelection: selection.clear,
    onShowSelection: selection.showForEditor,
  });
  const { isMobile, containerRef, minWidths, maxWidths } = usePanelSizing();

  useEffect(() => {
    void loadProject(projectId);
  }, [loadProject, projectId]);

  const activeFile = useMemo(
    () => openFiles.find((file) => file.id === activeFileId) ?? null,
    [activeFileId, openFiles],
  );
  const activeFileContent = activeFileId ? fileContents[activeFileId] ?? "" : "";
  const activeFileIsImage = activeFile ? isImageFile(activeFile) : false;

  useEffect(() => {
    if (activeFileIsImage) {
      setEditorInstance(null);
    }
  }, [activeFileIsImage, setEditorInstance]);

  const previewSize = useMemo(() => (sidebarOpen ? 40 : 50), [sidebarOpen]);

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
          <div
            className="absolute inset-0 z-10 bg-background/70"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <EditorSidebar
          activeSidebarTab={activeSidebarTab}
          sidebarOpen={sidebarOpen}
          projectName={projectName}
          files={filesTree}
          setSidebarOpen={setSidebarOpen}
          onOpenFile={(file) => {
            selection.clear();
            openFile(file);
          }}
          onCreateEntry={async (parentId, type, name) => {
            selection.clear();
            await createEntry(parentId, type, name);
          }}
          onUploadFile={async (parentId, file) => {
            selection.clear();
            await uploadFile(parentId, file);
          }}
          onRenameEntry={async (entryId, name) => {
            selection.clear();
            return renameEntry(entryId, name);
          }}
          onMoveEntry={async (entryId, parentId) => {
            selection.clear();
            return moveEntry(entryId, parentId);
          }}
          onDeleteEntry={async (entryId) => {
            selection.clear();
            return deleteEntry(entryId);
          }}
          onRenameProject={async (name) => {
            selection.clear();
            return renameProject(name);
          }}
        />

        <div ref={containerRef} className="min-w-0 flex-1 overflow-hidden">
          <ResizablePanelGroup
            direction={isMobile ? "vertical" : "horizontal"}
            className="h-full w-full"
          >
            {editorOpen ? (
              <ResizablePanel
                defaultSize={previewOpen ? 60 : 100}
                minSize={!isMobile && previewOpen ? minWidths.editor : 20}
                maxSize={!isMobile && previewOpen ? maxWidths.editor : undefined}
              >
                <EditorPanel
                  activeFile={activeFile}
                  activeFileContent={activeFileContent}
                  activeFileIsImage={activeFileIsImage}
                  selection={selection}
                  onEditorMount={handleEditorMount}
                />
              </ResizablePanel>
            ) : null}

            {editorOpen && previewOpen ? <ResizableHandle withHandle /> : null}

            {previewOpen ? (
              <ResizablePanel
                defaultSize={editorOpen ? previewSize : 100}
                minSize={!isMobile && editorOpen ? minWidths.preview : 20}
                maxSize={!isMobile && editorOpen ? maxWidths.preview : undefined}
              >
                <PreviewPanel />
              </ResizablePanel>
            ) : null}
          </ResizablePanelGroup>
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
