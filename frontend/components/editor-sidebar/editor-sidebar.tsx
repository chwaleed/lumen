"use client";

import { useMemo, useRef, useState } from "react";
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
  onUploadFile,
  onRenameEntry,
  onDeleteEntry,
  onRenameProject,
}: SidebarProps) {
  const [folderOpenState, setFolderOpenState] = useState<Record<string, boolean>>({});
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState(projectName);
  const [uploadParentId, setUploadParentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleUploadRequest = (parentId: string) => {
    setUploadParentId(parentId === "root" ? null : parentId);
    fileInputRef.current?.click();
  };

  const handleUploadInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    await onUploadFile(uploadParentId, file);
    setUploadParentId(null);
  };

  return (
    <div className="absolute left-0 z-20 md:relative md:left-0 w-full sm:w-72 flex-shrink-0 border-r bg-background md:bg-muted/10 flex-col h-full shadow-xl md:shadow-none flex">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadInputChange} />
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
          onUploadFile={handleUploadRequest}
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
