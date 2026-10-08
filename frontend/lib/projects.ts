import type { FileNode } from "@/components/editor-sidebar";

export type ProjectFileEntry = {
  id: number;
  project_id: number;
  parent_id: number | null;
  name: string;
  type: "file" | "folder";
  mime_type: string | null;
  file_url: string | null;
  size_bytes: number | null;
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

/**
 * Find a node by its path relative to the project root, e.g. `sections/bad.tex`.
 *
 * The tree stores names, not paths, so a compiler diagnostic -- which names a
 * path -- has to be walked back to a node before the file can be opened.
 */
export function findNodeByPath(nodes: FileNode[], path: string): FileNode | null {
  const segments = path.split("/").filter((segment) => segment && segment !== ".");
  if (segments.length === 0) {
    return null;
  }

  let current: FileNode[] = nodes;
  let found: FileNode | null = null;

  for (const [index, segment] of segments.entries()) {
    const isLast = index === segments.length - 1;
    const match = current.find(
      (node) => node.name === segment && (isLast ? node.type === "file" : node.type === "folder")
    );

    if (!match) {
      return null;
    }

    if (isLast) {
      found = match;
      break;
    }

    current = match.children ?? [];
  }

  return found;
}

/**
 * Extensions the backend will sign an upload for.
 *
 * Mirrors ALLOWED_EXTENSIONS in backend/src/uploads/service.py. Checked here
 * only to fail fast with a clear message -- the backend is the authority, and
 * it derives the content type from the extension because browsers report no
 * usable type for .sty, .cls or .bst.
 */
export const UPLOADABLE_EXTENSIONS = [
  ".bib",
  ".bst",
  ".cfg",
  ".clo",
  ".cls",
  ".def",
  ".eps",
  ".gif",
  ".jpeg",
  ".jpg",
  ".ldf",
  ".pdf",
  ".png",
  ".sty",
  ".svg",
  ".webp",
] as const;

export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot <= 0 ? "" : fileName.slice(dot).toLowerCase();
}

export function isUploadable(fileName: string): boolean {
  return (UPLOADABLE_EXTENSIONS as readonly string[]).includes(fileExtension(fileName));
}

/**
 * The base name an exported file is saved under, without an extension.
 *
 * Path separators would make the browser either reject the `download`
 * attribute or treat the name as a directory, and a project named only with
 * separators or spaces must still produce something openable.
 */
export function exportBaseName(projectName: string): string {
  const cleaned = projectName.replace(/[/\\]/g, "-").trim();
  return cleaned === "" ? "project" : cleaned;
}
