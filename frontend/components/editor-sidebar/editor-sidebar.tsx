"use client";

import { useState } from "react";
import {
  addNode,
  createNewFileNode,
  createNewFolderNode,
  deleteNode,
  duplicateNode,
  initialFiles,
  updateNode,
} from "./file-tree-utils";
import { SidebarAiTab } from "./sidebar-ai-tab";
import { SidebarFilesTab } from "./sidebar-files-tab";
import { FileNode, SidebarProps } from "./types";

export function EditorSidebar({
  activeSidebarTab,
  sidebarOpen,
  setSidebarOpen,
  onOpenFile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
}: SidebarProps) {
  const [files, setFiles] = useState<FileNode[]>(initialFiles);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [projectName, setProjectName] = useState("EXPLORER");
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editProjectNameValue, setEditProjectNameValue] = useState("");

  if (!sidebarOpen) {
    return null;
  }

  const findNodeById = (nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children) {
        const nested = findNodeById(node.children, id);
        if (nested) {
          return nested;
        }
      }
    }
    return null;
  };

  const handleToggleFolder = (id: string) => {
    setFiles(updateNode(files, id, (node) => ({ ...node, isOpen: !node.isOpen })));
  };

  const handleAddFile = (parentId: string) => {
    const newNode = createNewFileNode();
    setFiles(addNode(files, parentId, newNode));
    setEditingNodeId(newNode.id);
    setEditName(newNode.name);
    onCreateFile(newNode.id, newNode.name);
  };

  const handleAddFolder = (parentId: string) => {
    const newNode = createNewFolderNode();
    setFiles(addNode(files, parentId, newNode));
    setEditingNodeId(newNode.id);
    setEditName(newNode.name);
  };

  const handleRename = (id: string, currentName: string) => {
    setEditingNodeId(id);
    setEditName(currentName);
  };

  const submitRename = (id: string) => {
    if (editName.trim()) {
      const trimmedName = editName.trim();
      const targetNode = findNodeById(files, id);
      setFiles(updateNode(files, id, (node) => ({ ...node, name: trimmedName })));
      if (targetNode?.type === "file") {
        onRenameFile(id, trimmedName);
      }
    }
    setEditingNodeId(null);
  };

  return (
    <div className="absolute left-0 z-20 md:relative md:left-0 w-full sm:w-72 flex-shrink-0 border-r bg-background md:bg-muted/10 flex-col h-full shadow-xl md:shadow-none flex">
      {activeSidebarTab === "files" ? (
        <SidebarFilesTab
          files={files}
          editingNodeId={editingNodeId}
          editName={editName}
          setEditName={setEditName}
          projectName={projectName}
          isEditingProjectName={isEditingProjectName}
          editProjectNameValue={editProjectNameValue}
          setEditProjectNameValue={setEditProjectNameValue}
          setIsEditingProjectName={setIsEditingProjectName}
          setProjectName={setProjectName}
          onToggleFolder={handleToggleFolder}
          onSubmitRename={submitRename}
          onStartRename={handleRename}
          onDuplicate={(id) => setFiles(duplicateNode(files, id))}
          onDelete={(id) => {
            const targetNode = findNodeById(files, id);
            setFiles(deleteNode(files, id));
            if (targetNode?.type === "file") {
              onDeleteFile(id);
            }
          }}
          onAddFile={handleAddFile}
          onAddFolder={handleAddFolder}
          onOpenFile={onOpenFile}
          onCloseSidebar={() => setSidebarOpen(false)}
        />
      ) : null}
      {activeSidebarTab === "ai" ? <SidebarAiTab onCloseSidebar={() => setSidebarOpen(false)} /> : null}
    </div>
  );
}
