import { X } from "lucide-react";

type EditorFile = {
  id: string;
  name: string;
};

type EditorFileTabsProps = {
  files: EditorFile[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onCloseFile: (fileId: string) => void;
};

export function EditorFileTabs({ files, activeFileId, onSelectFile, onCloseFile }: EditorFileTabsProps) {
  return (
    <div className="flex min-w-0 items-center overflow-x-auto">
      {files.map((file) => (
        <button
          key={file.id}
          type="button"
          onClick={() => onSelectFile(file.id)}
          className={`group inline-flex min-w-fit shrink-0 items-center gap-1 border-r px-4 py-2 text-sm font-medium ${
            file.id === activeFileId
              ? "bg-background border-t-2 border-t-primary text-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          <span className="max-w-40 truncate">{file.name}</span>
          <span
            className="ml-1 rounded p-0.5 opacity-50 hover:bg-muted hover:opacity-100"
            onClick={(event) => {
              event.stopPropagation();
              onCloseFile(file.id);
            }}
          >
            <X className="size-3.5" />
          </span>
        </button>
      ))}
    </div>
  );
}
