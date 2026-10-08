import { FilePlus, FileText, Folder, FolderPlus, MoreVertical, Pencil, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarHeader } from "./sidebar-header";
import { SidebarTreeNode } from "./sidebar-tree-node";
import type { FileNode, PendingCreateEntry } from "./types";

type SidebarFilesTabProps = {
  files: FileNode[];
  projectName: string;
  editingNodeId: string | null;
  editName: string;
  setEditName: (name: string) => void;
  isEditingProjectName: boolean;
  projectNameDraft: string;
  setProjectNameDraft: (name: string) => void;
  onToggleFolder: (id: string) => void;
  pendingCreateEntry: PendingCreateEntry | null;
  setPendingCreateName: (name: string) => void;
  onAddFile: (parentId: string) => void;
  onAddFolder: (parentId: string) => void;
  onSubmitCreate: () => void;
  onCancelCreate: () => void;
  onUploadFile: (parentId: string) => void;
  onOpenFile: (file: FileNode) => void;
  onStartRename: (entryId: string, currentName: string) => void;
  onSubmitRename: (entryId: string) => Promise<void>;
  onDelete: (entryId: string) => Promise<void>;
  draggedNodeId: string | null;
  dropTargetId: string | null;
  onDragStart: (entryId: string) => void;
  onDragEnd: () => void;
  onDropTargetChange: (entryId: string | null) => void;
  onMoveEntry: (entryId: string, parentId: string) => void;
  onStartProjectRename: () => void;
  onSubmitProjectRename: () => Promise<void>;
  onCloseSidebar: () => void;
};

export function SidebarFilesTab({
  files,
  projectName,
  editingNodeId,
  editName,
  setEditName,
  isEditingProjectName,
  projectNameDraft,
  setProjectNameDraft,
  pendingCreateEntry,
  setPendingCreateName,
  onToggleFolder,
  onAddFile,
  onAddFolder,
  onSubmitCreate,
  onCancelCreate,
  onUploadFile,
  onOpenFile,
  onStartRename,
  onSubmitRename,
  onDelete,
  draggedNodeId,
  dropTargetId,
  onDragStart,
  onDragEnd,
  onDropTargetChange,
  onMoveEntry,
  onStartProjectRename,
  onSubmitProjectRename,
  onCloseSidebar,
}: SidebarFilesTabProps) {
  const rootFolders = files.filter((node) => node.type === "folder");
  const rootFiles = files.filter((node) => node.type === "file");

  const renderCreateInput = (level: number) => {
    if (!pendingCreateEntry) {
      return null;
    }

    const paddingLeft = level * 12 + 32;
    const Icon = pendingCreateEntry.type === "folder" ? Folder : FileText;

    return (
      <div className="flex items-center rounded-md py-1.5 pr-2 text-sm" style={{ paddingLeft: `${paddingLeft}px` }}>
        <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
        <Input
          value={pendingCreateEntry.name}
          onChange={(event) => setPendingCreateName(event.target.value)}
          onBlur={onSubmitCreate}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onSubmitCreate();
            }
            if (event.key === "Escape") {
              onCancelCreate();
            }
          }}
          className="h-6 w-full bg-background px-1 py-0 text-xs"
          autoFocus
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <SidebarHeader
        title={
          isEditingProjectName ? (
            <Input
              value={projectNameDraft}
              onChange={(event) => setProjectNameDraft(event.target.value)}
              onBlur={() => void onSubmitProjectRename()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void onSubmitProjectRename();
                }
              }}
              className="h-6 w-36 bg-background px-1 py-0 text-xs font-semibold uppercase tracking-wider"
              autoFocus
            />
          ) : (
            <h2 className="mr-2 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {projectName}
            </h2>
          )
        }
        rightContent={
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onAddFile("root")}
              aria-label="Create file"
              title="New File"
            >
              <FilePlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onAddFolder("root")}
              aria-label="Create folder"
              title="New Folder"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 mr-1"
              onClick={() => onUploadFile("root")}
              aria-label="Upload file"
              title="Upload File"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-1 h-6 w-6" aria-label="Project actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onStartProjectRename}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Rename Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        onClose={onCloseSidebar}
      />

      <ScrollArea
        // min-h-0: a flex item defaults to min-height:auto, so without this
        // the scroll area grows to fit every file and the list never scrolls.
        className="min-h-0 flex-1"
        onDragOver={(event) => {
          if (!draggedNodeId) {
            return;
          }

          event.preventDefault();
          onDropTargetChange("root");
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            onDropTargetChange(null);
          }
        }}
        onDrop={(event) => {
          if (!draggedNodeId) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          onMoveEntry(draggedNodeId, "root");
          onDragEnd();
        }}
      >
        <div className="p-2 space-y-0.5">
          {dropTargetId === "root" ? (
            <div className="mb-1 rounded-md border border-dashed border-primary/60 bg-primary/10 px-2 py-1 text-xs text-primary">
              Move to project root
            </div>
          ) : null}
          {pendingCreateEntry?.parentId === "root" && pendingCreateEntry.type === "folder" ? renderCreateInput(0) : null}
          {rootFolders.map((node) => (
            <SidebarTreeNode
              key={node.id}
              node={node}
              level={0}
              editingNodeId={editingNodeId}
              editName={editName}
              setEditName={setEditName}
              pendingCreateEntry={pendingCreateEntry}
              renderCreateInput={renderCreateInput}
              onToggleFolder={onToggleFolder}
              onAddFile={onAddFile}
              onAddFolder={onAddFolder}
              onUploadFile={onUploadFile}
              onOpenFile={onOpenFile}
              onStartRename={onStartRename}
              onSubmitRename={onSubmitRename}
              onDelete={onDelete}
              draggedNodeId={draggedNodeId}
              dropTargetId={dropTargetId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDropTargetChange={onDropTargetChange}
              onMoveEntry={onMoveEntry}
            />
          ))}
          {pendingCreateEntry?.parentId === "root" && pendingCreateEntry.type === "file" ? renderCreateInput(0) : null}
          {rootFiles.map((node) => (
            <SidebarTreeNode
              key={node.id}
              node={node}
              level={0}
              editingNodeId={editingNodeId}
              editName={editName}
              setEditName={setEditName}
              pendingCreateEntry={pendingCreateEntry}
              renderCreateInput={renderCreateInput}
              onToggleFolder={onToggleFolder}
              onAddFile={onAddFile}
              onAddFolder={onAddFolder}
              onUploadFile={onUploadFile}
              onOpenFile={onOpenFile}
              onStartRename={onStartRename}
              onSubmitRename={onSubmitRename}
              onDelete={onDelete}
              draggedNodeId={draggedNodeId}
              dropTargetId={dropTargetId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDropTargetChange={onDropTargetChange}
              onMoveEntry={onMoveEntry}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
