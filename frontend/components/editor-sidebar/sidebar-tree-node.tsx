import { ChevronDown, ChevronRight, FilePlus, FileText, Folder, FolderPlus, Image as ImageIcon, MoreVertical, Pencil, Trash2, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileNode, PendingCreateEntry } from "./types";

type SidebarTreeNodeProps = {
  node: FileNode;
  level: number;
  editingNodeId: string | null;
  editName: string;
  setEditName: (name: string) => void;
  pendingCreateEntry: PendingCreateEntry | null;
  renderCreateInput: (level: number) => ReactNode;
  onToggleFolder: (id: string) => void;
  onAddFile: (parentId: string) => void;
  onAddFolder: (parentId: string) => void;
  onUploadFile: (parentId: string) => void;
  onOpenFile: (file: FileNode) => void;
  onStartRename: (nodeId: string, currentName: string) => void;
  onSubmitRename: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  draggedNodeId: string | null;
  dropTargetId: string | null;
  onDragStart: (nodeId: string) => void;
  onDragEnd: () => void;
  onDropTargetChange: (nodeId: string | null) => void;
  onMoveEntry: (nodeId: string, parentId: string) => void;
};

const fileIconClass = "h-4 w-4 mr-2 text-muted-foreground";

function renderFileIcon(name: string) {
  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".svg")) {
    return <ImageIcon className={fileIconClass} />;
  }

  return <FileText className={fileIconClass} />;
}

export function SidebarTreeNode({
  node,
  level,
  editingNodeId,
  editName,
  setEditName,
  pendingCreateEntry,
  renderCreateInput,
  onToggleFolder,
  onAddFile,
  onAddFolder,
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
}: SidebarTreeNodeProps) {
  const paddingLeft = level * 12 + 8;
  const isDragging = draggedNodeId === node.id;
  const isFolderDropTarget = node.type === "folder" && dropTargetId === node.id && draggedNodeId !== node.id;
  const childFolders = (node.children ?? []).filter((childNode) => childNode.type === "folder");
  const childFiles = (node.children ?? []).filter((childNode) => childNode.type === "file");

  return (
    <div>
      <div
        className={`flex items-center justify-between rounded-md py-1.5 text-sm hover:bg-muted group ${
          isDragging ? "opacity-50" : ""
        } ${isFolderDropTarget ? "bg-primary/10 ring-1 ring-primary/40" : ""}`}
        style={{ paddingLeft: `${paddingLeft}px`, paddingRight: "8px" }}
        draggable={editingNodeId !== node.id}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", node.id);
          onDragStart(node.id);
        }}
        onDragEnd={onDragEnd}
        onDragOver={(event) => {
          if (!draggedNodeId) {
            return;
          }

          if (node.type !== "folder" || draggedNodeId === node.id) {
            event.stopPropagation();
            onDropTargetChange(null);
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "move";
          onDropTargetChange(node.id);
        }}
        onDrop={(event) => {
          if (!draggedNodeId) {
            return;
          }

          if (node.type !== "folder" || draggedNodeId === node.id) {
            event.stopPropagation();
            onDropTargetChange(null);
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          onMoveEntry(draggedNodeId, node.id);
          onDragEnd();
        }}
      >
        <div
          className="flex items-center flex-1 overflow-hidden cursor-pointer"
          onClick={() => (node.type === "folder" ? onToggleFolder(node.id) : onOpenFile(node))}
        >
          {node.type === "folder" ? (
            <>
              <div className="w-4 h-4 mr-1 flex items-center justify-center">
                {node.isOpen ? (
                  <ChevronDown className="h-3 w-3 opacity-50" />
                ) : (
                  <ChevronRight className="h-3 w-3 opacity-50" />
                )}
              </div>
              <Folder className="h-4 w-4 mr-2 text-foreground" />
            </>
          ) : (
            <>
              <div className="w-4 h-4 mr-1"></div>
              {renderFileIcon(node.name)}
            </>
          )}

          {editingNodeId === node.id ? (
            <Input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              onBlur={() => void onSubmitRename(node.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void onSubmitRename(node.id);
                }
              }}
              className="h-6 w-full bg-background px-1 py-0 text-xs"
              autoFocus
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <span className="truncate">{node.name}</span>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 md:opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {node.type === "folder" ? (
              <>
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddFile(node.id);
                  }}
                >
                  <FilePlus className="mr-2 h-4 w-4" /> New File
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddFolder(node.id);
                  }}
                >
                  <FolderPlus className="mr-2 h-4 w-4" /> New Folder
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    onUploadFile(node.id);
                  }}
                >
                  <Upload className="mr-2 h-4 w-4" /> Upload File
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                onStartRename(node.id, node.name);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(node.id);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {node.type === "folder" && node.isOpen ? (
        <div>
          {pendingCreateEntry?.parentId === node.id && pendingCreateEntry.type === "folder"
            ? renderCreateInput(level + 1)
            : null}
          {childFolders.map((childNode) => (
            <SidebarTreeNode
              key={childNode.id}
              node={childNode}
              level={level + 1}
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
          {pendingCreateEntry?.parentId === node.id && pendingCreateEntry.type === "file"
            ? renderCreateInput(level + 1)
            : null}
          {childFiles.map((childNode) => (
            <SidebarTreeNode
              key={childNode.id}
              node={childNode}
              level={level + 1}
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
      ) : null}
    </div>
  );
}
