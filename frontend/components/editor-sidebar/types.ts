export type SidebarTab = "files" | "ai";

export type SidebarProps = {
  activeSidebarTab: SidebarTab | string;
  sidebarOpen: boolean;
  projectName: string;
  files: FileNode[];
  setSidebarOpen: (open: boolean) => void;
  onOpenFile: (file: FileNode) => void;
  onCreateEntry: (parentId: string | null, type: FileNode["type"], name: string) => Promise<void>;
  onUploadFile: (parentId: string | null, file: File) => Promise<void>;
  onRenameEntry: (entryId: string, name: string) => Promise<boolean>;
  onMoveEntry: (entryId: string, parentId: string | null) => Promise<boolean>;
  onDeleteEntry: (entryId: string) => Promise<boolean>;
  onRenameProject: (name: string) => Promise<boolean>;
};

export type PendingCreateEntry = {
  parentId: string;
  type: FileNode["type"];
  name: string;
};

export type FileNode = {
  id: string;
  name: string;
  type: "file" | "folder";
  mimeType?: string | null;
  fileUrl?: string | null;
  children?: FileNode[];
  isOpen?: boolean;
};
