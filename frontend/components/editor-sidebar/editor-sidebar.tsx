"use client";

import { useMemo, useRef, useState } from "react";
import { SidebarAiTab } from "./sidebar-ai-tab";
import { SidebarFilesTab } from "./sidebar-files-tab";
import type { FileNode, PendingCreateEntry, SidebarProps } from "./types";

function getDefaultCreateName(type: FileNode["type"]) {
  return type === "folder" ? "New Folder" : "untitled.tex";
}

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
  onMoveEntry,
  onDeleteEntry,
  onRenameProject,
}: SidebarProps) {
  const [folderOpenState, setFolderOpenState] = useState<Record<string, boolean>>({});
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState(projectName);
  const [uploadParentId, setUploadParentId] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [pendingCreateEntry, setPendingCreateEntry] = useState<PendingCreateEntry | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isSubmittingCreateRef = useRef(false);

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

  const handleStartCreate = (parentId: string, type: FileNode["type"]) => {
    setEditingNodeId(null);
    setPendingCreateEntry({
      parentId,
      type,
      name: getDefaultCreateName(type),
    });

    if (parentId !== "root") {
      setFolderOpenState((currentState) => ({
        ...currentState,
        [parentId]: true,
      }));
    }
  };

  const handleSubmitCreate = async () => {
    if (!pendingCreateEntry || isSubmittingCreateRef.current) {
      return;
    }

    const trimmedName = pendingCreateEntry.name.trim();
    if (!trimmedName) {
      setPendingCreateEntry(null);
      return;
    }

    isSubmittingCreateRef.current = true;
    const parentId = pendingCreateEntry.parentId === "root" ? null : pendingCreateEntry.parentId;
    const type = pendingCreateEntry.type;
    setPendingCreateEntry(null);

    try {
      await onCreateEntry(parentId, type, trimmedName);
    } finally {
      isSubmittingCreateRef.current = false;
    }
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

  const handleMove = async (nodeId: string, parentId: string | null) => {
    if (nodeId === parentId) {
      return;
    }

    const didMove = await onMoveEntry(nodeId, parentId);
    if (didMove && parentId) {
      setFolderOpenState((currentState) => ({
        ...currentState,
        [parentId]: true,
      }));
    }
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
          pendingCreateEntry={pendingCreateEntry}
          setPendingCreateName={(name) =>
            setPendingCreateEntry((currentEntry) => (currentEntry ? { ...currentEntry, name } : currentEntry))
          }
          onToggleFolder={handleToggleFolder}
          onAddFile={(parentId) => handleStartCreate(parentId, "file")}
          onAddFolder={(parentId) => handleStartCreate(parentId, "folder")}
          onSubmitCreate={() => void handleSubmitCreate()}
          onCancelCreate={() => setPendingCreateEntry(null)}
          onUploadFile={handleUploadRequest}
          onOpenFile={onOpenFile}
          onStartRename={handleStartRename}
          onSubmitRename={handleSubmitRename}
          onDelete={handleDelete}
          draggedNodeId={draggedNodeId}
          dropTargetId={dropTargetId}
          onDragStart={setDraggedNodeId}
          onDragEnd={() => {
            setDraggedNodeId(null);
            setDropTargetId(null);
          }}
          onDropTargetChange={setDropTargetId}
          onMoveEntry={(nodeId, parentId) => void handleMove(nodeId, parentId === "root" ? null : parentId)}
          onStartProjectRename={handleStartProjectRename}
          onSubmitProjectRename={handleSubmitProjectRename}
          onCloseSidebar={() => setSidebarOpen(false)}
        />
      ) : null}
      {activeSidebarTab === "ai" ? <SidebarAiTab onCloseSidebar={() => setSidebarOpen(false)} /> : null}
    </div>
  );
}
