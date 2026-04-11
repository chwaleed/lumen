export type SidebarTab = "files" | "ai";

export type SidebarProps = {
  activeSidebarTab: SidebarTab | string;
  sidebarOpen: boolean;
  projectName: string;
  files: FileNode[];
  setSidebarOpen: (open: boolean) => void;
  onOpenFile: (fileId: string, fileName: string) => void;
  onCreateEntry: (parentId: string | null, type: FileNode["type"]) => Promise<void>;
};

export type FileNode = {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  isOpen?: boolean;
};
