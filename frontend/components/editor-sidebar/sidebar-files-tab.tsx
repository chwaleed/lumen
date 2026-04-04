import { FilePlus, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarHeader } from "./sidebar-header";
import { SidebarTreeNode } from "./sidebar-tree-node";
import { FileNode } from "./types";

type SidebarFilesTabProps = {
  files: FileNode[];
  editingNodeId: string | null;
  editName: string;
  setEditName: (name: string) => void;
  projectName: string;
  isEditingProjectName: boolean;
  editProjectNameValue: string;
  setEditProjectNameValue: (name: string) => void;
  setIsEditingProjectName: (editing: boolean) => void;
  setProjectName: (name: string) => void;
  onToggleFolder: (id: string) => void;
  onSubmitRename: (id: string) => void;
  onStartRename: (id: string, currentName: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onAddFile: (parentId: string) => void;
  onAddFolder: (parentId: string) => void;
  onOpenFile: (fileId: string, fileName: string) => void;
  onCloseSidebar: () => void;
};

export function SidebarFilesTab({
  files,
  editingNodeId,
  editName,
  setEditName,
  projectName,
  isEditingProjectName,
  editProjectNameValue,
  setEditProjectNameValue,
  setIsEditingProjectName,
  setProjectName,
  onToggleFolder,
  onSubmitRename,
  onStartRename,
  onDuplicate,
  onDelete,
  onAddFile,
  onAddFolder,
  onOpenFile,
  onCloseSidebar,
}: SidebarFilesTabProps) {
  return (
    <div className="flex flex-col h-full">
      <SidebarHeader
        title={
          isEditingProjectName ? (
            <Input
              value={editProjectNameValue}
              onChange={(event) => setEditProjectNameValue(event.target.value)}
              onBlur={() => {
                if (editProjectNameValue.trim()) {
                  setProjectName(editProjectNameValue.trim().toUpperCase());
                }
                setIsEditingProjectName(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  if (editProjectNameValue.trim()) {
                    setProjectName(editProjectNameValue.trim().toUpperCase());
                  }
                  setIsEditingProjectName(false);
                }

                if (event.key === "Escape") {
                  setIsEditingProjectName(false);
                }
              }}
              className="h-6 text-xs px-1 py-0 w-32 bg-background font-semibold uppercase tracking-wider"
              autoFocus
            />
          ) : (
            <h2
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors truncate mr-2"
              onClick={() => {
                setEditProjectNameValue(projectName);
                setIsEditingProjectName(true);
              }}
              title="Click to rename project"
            >
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
              className="h-6 w-6 mr-1"
              onClick={() => onAddFolder("root")}
              aria-label="Create folder"
              title="New Folder"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </>
        }
        onClose={onCloseSidebar}
      />

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {files.map((node) => (
            <SidebarTreeNode
              key={node.id}
              node={node}
              level={0}
              editingNodeId={editingNodeId}
              editName={editName}
              setEditName={setEditName}
              onToggleFolder={onToggleFolder}
              onSubmitRename={onSubmitRename}
              onStartRename={onStartRename}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onAddFile={onAddFile}
              onAddFolder={onAddFolder}
              onOpenFile={onOpenFile}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
