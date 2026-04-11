import { FilePlus, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarHeader } from "./sidebar-header";
import { SidebarTreeNode } from "./sidebar-tree-node";
import { FileNode } from "./types";

type SidebarFilesTabProps = {
  files: FileNode[];
  projectName: string;
  onToggleFolder: (id: string) => void;
  onAddFile: (parentId: string) => void;
  onAddFolder: (parentId: string) => void;
  onOpenFile: (fileId: string, fileName: string) => void;
  onCloseSidebar: () => void;
};

export function SidebarFilesTab({
  files,
  projectName,
  onToggleFolder,
  onAddFile,
  onAddFolder,
  onOpenFile,
  onCloseSidebar,
}: SidebarFilesTabProps) {
  return (
    <div className="flex flex-col h-full">
      <SidebarHeader
        title={<h2 className="mr-2 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">{projectName}</h2>}
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
              onToggleFolder={onToggleFolder}
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
