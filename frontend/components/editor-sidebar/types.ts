export type SidebarTab = "files" | "search" | "ai";

export type SidebarProps = {
  activeSidebarTab: SidebarTab | string;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  replaceQuery: string;
  setReplaceQuery: (query: string) => void;
  handleFindNext: () => void;
  handleReplaceAll: () => void;
  onOpenFile: (fileId: string, fileName: string) => void;
  onCreateFile: (fileId: string, fileName: string) => void;
  onRenameFile: (fileId: string, fileName: string) => void;
  onDeleteFile: (fileId: string) => void;
};

export type FileNode = {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  isOpen?: boolean;
};
