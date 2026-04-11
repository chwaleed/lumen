"use client";

import { useMemo, useState } from "react";
import { SidebarAiTab } from "./sidebar-ai-tab";
import { SidebarFilesTab } from "./sidebar-files-tab";
import { SidebarProps } from "./types";

export function EditorSidebar({
  activeSidebarTab,
  sidebarOpen,
  projectName,
  files: incomingFiles,
  setSidebarOpen,
  onOpenFile,
  onCreateEntry,
  onRenameEntry,
  onDeleteEntry,
  onRenameProject,
}: SidebarProps) {
  const [folderOpenState, setFolderOpenState] = useState<Record<string, boolean>>({});
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState(projectName);

  const findFolderOpenState = (nodes: SidebarProps["files"], id: string): boolean | undefined => {
    for (const node of nodes) {
      if (node.id === id) {
        return Boolean(node.isOpen);
      }

      if (node.children) {
        const nestedResult = findFolderOpenState(node.children, id);
        if (nestedResult !== undefined) {
          return nestedResult;
        }
      }
    }

    return undefined;
  };

  const files = useMemo(() => {
    const applyFolderState = (nodes: SidebarProps["files"]): SidebarProps["files"] =>
      nodes.map((node) => ({
        ...node,
        isOpen:
          node.type === "folder"
            ? (folderOpenState[node.id] ?? node.isOpen ?? false)
            : undefined,
        children: node.children ? applyFolderState(node.children) : undefined,
      }));

    return applyFolderState(incomingFiles);
  }, [folderOpenState, incomingFiles]);

  const resolvedProjectName = isEditingProjectName ? projectNameDraft : projectName;

  if (!sidebarOpen) {
    return null;
  }

  const handleToggleFolder = (id: string) => {
    setFolderOpenState((currentState) => ({
      ...currentState,
      [id]: !(currentState[id] ?? findFolderOpenState(files, id) ?? false),
    }));
  };

  const handleStartRename = (nodeId: string, currentName: string) => {
    setEditingNodeId(nodeId);
    setEditName(currentName);
  };

  const handleSubmitRename = async (nodeId: string) => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditingNodeId(null);
      return;
    }

    const didRename = await onRenameEntry(nodeId, trimmedName);
    if (didRename) {
      setEditingNodeId(null);
      setEditName("");
    }
  };

  const handleDelete = async (nodeId: string) => {
    await onDeleteEntry(nodeId);
  };

  const handleStartProjectRename = () => {
    setProjectNameDraft(projectName);
    setIsEditingProjectName(true);
  };

  const handleSubmitProjectRename = async () => {
    const trimmedName = projectNameDraft.trim();
    if (!trimmedName) {
      setIsEditingProjectName(false);
      setProjectNameDraft(projectName);
      return;
    }

    const didRename = await onRenameProject(trimmedName);
    if (didRename) {
      setIsEditingProjectName(false);
    }
  };

  return (
    <div className="absolute left-0 z-20 md:relative md:left-0 w-full sm:w-72 flex-shrink-0 border-r bg-background md:bg-muted/10 flex-col h-full shadow-xl md:shadow-none flex">
      {activeSidebarTab === "files" ? (
        <SidebarFilesTab
          files={files}
          projectName={resolvedProjectName}
          editingNodeId={editingNodeId}
          editName={editName}
          setEditName={setEditName}
          isEditingProjectName={isEditingProjectName}
          projectNameDraft={projectNameDraft}
          setProjectNameDraft={setProjectNameDraft}
          onToggleFolder={handleToggleFolder}
          onAddFile={(parentId) => void onCreateEntry(parentId === "root" ? null : parentId, "file")}
          onAddFolder={(parentId) => void onCreateEntry(parentId === "root" ? null : parentId, "folder")}
          onOpenFile={onOpenFile}
          onStartRename={handleStartRename}
          onSubmitRename={handleSubmitRename}
          onDelete={handleDelete}
          onStartProjectRename={handleStartProjectRename}
          onSubmitProjectRename={handleSubmitProjectRename}
          onCloseSidebar={() => setSidebarOpen(false)}
        />
      ) : null}
      {activeSidebarTab === "ai" ? <SidebarAiTab onCloseSidebar={() => setSidebarOpen(false)} /> : null}
    </div>
  );
}
