export type SidebarTab = "files" | "ai";

export type SidebarProps = {
  activeSidebarTab: SidebarTab | string;
  sidebarOpen: boolean;
  projectName: string;
  files: FileNode[];
  setSidebarOpen: (open: boolean) => void;
  onOpenFile: (fileId: string, fileName: string) => void;
  onCreateEntry: (parentId: string | null, type: FileNode["type"]) => Promise<void>;
  onUploadFile: (parentId: string | null, file: File) => Promise<void>;
  onRenameEntry: (entryId: string, name: string) => Promise<boolean>;
  onDeleteEntry: (entryId: string) => Promise<boolean>;
  onRenameProject: (name: string) => Promise<boolean>;
};

export type FileNode = {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  isOpen?: boolean;
};
