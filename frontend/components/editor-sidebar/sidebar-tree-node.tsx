import { ChevronDown, ChevronRight, FilePlus, FileText, Folder, FolderPlus, Image as ImageIcon, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileNode } from "./types";

type SidebarTreeNodeProps = {
  node: FileNode;
  level: number;
  editingNodeId: string | null;
  editName: string;
  setEditName: (name: string) => void;
  onToggleFolder: (id: string) => void;
  onAddFile: (parentId: string) => void;
  onAddFolder: (parentId: string) => void;
  onOpenFile: (fileId: string, fileName: string) => void;
  onStartRename: (nodeId: string, currentName: string) => void;
  onSubmitRename: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
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
  onToggleFolder,
  onAddFile,
  onAddFolder,
  onOpenFile,
  onStartRename,
  onSubmitRename,
  onDelete,
}: SidebarTreeNodeProps) {
  const paddingLeft = level * 12 + 8;

  return (
    <div>
      <div
        className="flex items-center justify-between rounded-md py-1.5 text-sm hover:bg-muted group"
        style={{ paddingLeft: `${paddingLeft}px`, paddingRight: "8px" }}
      >
        <div
          className="flex items-center flex-1 overflow-hidden cursor-pointer"
          onClick={() => (node.type === "folder" ? onToggleFolder(node.id) : onOpenFile(node.id, node.name))}
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

      {node.type === "folder" && node.isOpen && node.children ? (
        <div>
          {node.children.map((childNode) => (
            <SidebarTreeNode
              key={childNode.id}
              node={childNode}
              level={level + 1}
              editingNodeId={editingNodeId}
              editName={editName}
              setEditName={setEditName}
              onToggleFolder={onToggleFolder}
              onAddFile={onAddFile}
              onAddFolder={onAddFolder}
              onOpenFile={onOpenFile}
              onStartRename={onStartRename}
              onSubmitRename={onSubmitRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
