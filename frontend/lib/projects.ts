import type { FileNode } from "@/components/editor-sidebar";

export type ProjectFileEntry = {
  id: number;
  project_id: number;
  parent_id: number | null;
  name: string;
  type: "file" | "folder";
  mime_type: string | null;
  file_url: string | null;
  content: string | null;
  snapshot_version: number | null;
  created_at: string;
  updated_at: string;
};

export type ProjectDetail = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  files: ProjectFileEntry[];
};

function sortNodes(nodes: FileNode[]) {
  return [...nodes].sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === "folder" ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });
}

export function buildFileTree(entries: ProjectFileEntry[], openNodeIds: Set<string> = new Set()): FileNode[] {
  const childrenByParentId = new Map<number | null, ProjectFileEntry[]>();

  for (const entry of entries) {
    const siblings = childrenByParentId.get(entry.parent_id) ?? [];
    siblings.push(entry);
    childrenByParentId.set(entry.parent_id, siblings);
  }

  const buildNodes = (parentId: number | null): FileNode[] =>
    sortNodes(
      (childrenByParentId.get(parentId) ?? []).map((entry) => ({
        id: String(entry.id),
        name: entry.name,
        type: entry.type,
        mimeType: entry.mime_type,
        fileUrl: entry.file_url,
        isOpen: entry.type === "folder" ? openNodeIds.has(String(entry.id)) || parentId === null : undefined,
        children: entry.type === "folder" ? buildNodes(entry.id) : undefined,
      }))
    );

  return buildNodes(null);
}

export function createFileContents(entries: ProjectFileEntry[]) {
  return Object.fromEntries(
    entries
      .filter((entry) => entry.type === "file")
      .map((entry) => [String(entry.id), entry.content ?? ""])
  );
}

export function createSnapshotVersions(entries: ProjectFileEntry[]) {
  return Object.fromEntries(
    entries
      .filter((entry) => entry.type === "file")
      .map((entry) => [String(entry.id), entry.snapshot_version ?? 0])
  );
}

export function findInitialOpenFile(entries: ProjectFileEntry[]) {
  const fileEntries = entries.filter((entry) => entry.type === "file");

  if (fileEntries.length === 0) {
    return null;
  }

  return fileEntries.find((entry) => entry.name === "main.tex") ?? fileEntries[0];
}
