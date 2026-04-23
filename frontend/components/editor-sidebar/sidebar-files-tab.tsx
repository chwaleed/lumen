import { FilePlus, FolderPlus, MoreVertical, Pencil, Upload } from "lucide-react";
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
import { FileNode } from "./types";

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
  onAddFile: (parentId: string) => void;
  onAddFolder: (parentId: string) => void;
  onUploadFile: (parentId: string) => void;
  onOpenFile: (fileId: string, fileName: string) => void;
  onStartRename: (entryId: string, currentName: string) => void;
  onSubmitRename: (entryId: string) => Promise<void>;
  onDelete: (entryId: string) => Promise<void>;
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
  onToggleFolder,
  onAddFile,
  onAddFolder,
  onUploadFile,
  onOpenFile,
  onStartRename,
  onSubmitRename,
  onDelete,
  onStartProjectRename,
  onSubmitProjectRename,
  onCloseSidebar,
}: SidebarFilesTabProps) {
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
              onAddFile={onAddFile}
              onAddFolder={onAddFolder}
              onUploadFile={onUploadFile}
              onOpenFile={onOpenFile}
              onStartRename={onStartRename}
              onSubmitRename={onSubmitRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
