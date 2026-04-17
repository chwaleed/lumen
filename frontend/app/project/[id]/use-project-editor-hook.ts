"use client";

import type { editor as MonacoEditor } from "monaco-editor";
import { create } from "zustand";
import { addNode, deleteNode, updateNode } from "@/components/editor-sidebar/file-tree-utils";
import type { FileNode } from "@/components/editor-sidebar";
import { postApi, requestApi } from "@/lib/http/client";
import {
  buildFileTree,
  createFileContents,
  createSnapshotVersions,
  findInitialOpenFile,
  type ProjectDetail,
  type ProjectFileEntry,
} from "@/lib/projects";

export type SidebarTab = "files" | "ai";

export type EditorFile = {
  id: string;
  name: string;
};

type LoadStatus = "idle" | "loading" | "loaded" | "error";

type CreateEntryType = "file" | "folder";

type ProjectEditorState = {
  projectId: string | null;
  projectName: string;
  projectStatus: LoadStatus;
  projectErrorMessage: string | null;
  filesTree: FileNode[];
  activeSidebarTab: SidebarTab;
  sidebarOpen: boolean;
  editorOpen: boolean;
  previewOpen: boolean;
  wordWrap: boolean;
  editorInstance: MonacoEditor.IStandaloneCodeEditor | null;
  openFiles: EditorFile[];
  activeFileId: string | null;
  fileContents: Record<string, string>;
  snapshotVersions: Record<string, number>;
  isAiChatExpanded: boolean;
  aiChatPrompt: string;
  aiChatHistory: string[];
  setActiveSidebarTab: (tab: SidebarTab) => void;
  setSidebarOpen: (open: boolean) => void;
  setEditorOpen: (open: boolean) => void;
  setPreviewOpen: (open: boolean) => void;
  toggleWordWrap: () => void;
  setEditorInstance: (editor: MonacoEditor.IStandaloneCodeEditor | null) => void;
  setAiChatExpanded: (expanded: boolean) => void;
  setAiChatPrompt: (value: string) => void;
  submitAiChatPrompt: () => void;
  initializeForViewport: (isMobile: boolean) => void;
  loadProject: (projectId: string) => Promise<void>;
  openFile: (fileId: string, fileName: string) => void;
  createEntry: (parentId: string | null, type: CreateEntryType) => Promise<void>;
  renameProject: (name: string) => Promise<boolean>;
  renameEntry: (entryId: string, name: string) => Promise<boolean>;
  deleteEntry: (entryId: string) => Promise<boolean>;
  createUntitledFile: () => Promise<void>;
  closeFile: (fileId: string) => void;
  setActiveFile: (fileId: string) => void;
  setActiveFileContent: (value: string) => void;
  setFileContent: (fileId: string, value: string) => void;
  setFileSnapshotVersion: (fileId: string, version: number) => void;
  saveActiveFile: () => void;
  cutSelection: () => Promise<void>;
  copySelection: () => Promise<void>;
  pasteSelection: () => Promise<void>;
  insertSnippet: (textToInsert: string) => void;
};

function withOpenFile(state: ProjectEditorState, fileId: string, fileName: string) {
  const hasOpenTab = state.openFiles.some((file) => file.id === fileId);
  const openFiles = hasOpenTab ? state.openFiles : [...state.openFiles, { id: fileId, name: fileName }];
  const hasContent = Object.prototype.hasOwnProperty.call(state.fileContents, fileId);
  const fileContents = hasContent ? state.fileContents : { ...state.fileContents, [fileId]: "" };

  return {
    openFiles,
    activeFileId: fileId,
    fileContents,
  };
}

function getDefaultEntryName(tree: FileNode[], type: CreateEntryType) {
  const existingNames = new Set<string>();

  const collectNames = (nodes: FileNode[]) => {
    for (const node of nodes) {
      existingNames.add(node.name);
      if (node.children) {
        collectNames(node.children);
      }
    }
  };

  collectNames(tree);

  const baseName = type === "file" ? "new_file" : "New Folder";
  const extension = type === "file" ? ".tex" : "";

  let candidate = `${baseName}${extension}`;
  let counter = 2;
  while (existingNames.has(candidate)) {
    candidate = `${baseName}_${counter}${extension}`;
    counter += 1;
  }

  return candidate;
}

function createFileNode(entry: ProjectFileEntry): FileNode {
  return {
    id: String(entry.id),
    name: entry.name,
    type: entry.type,
    isOpen: entry.type === "folder",
    children: entry.type === "folder" ? [] : undefined,
  };
}

function renameOpenFiles(openFiles: EditorFile[], entryId: string, name: string) {
  return openFiles.map((file) => (file.id === entryId ? { ...file, name } : file));
}

function collectDescendantIds(nodes: FileNode[], targetId: string): string[] {
  for (const node of nodes) {
    if (node.id === targetId) {
      return collectNodeIds(node);
    }

    if (node.children) {
      const nestedIds = collectDescendantIds(node.children, targetId);
      if (nestedIds.length > 0) {
        return nestedIds;
      }
    }
  }

  return [];
}

function collectNodeIds(node: FileNode): string[] {
  const childIds = (node.children ?? []).flatMap((childNode) => collectNodeIds(childNode));
  return [node.id, ...childIds];
}

function removeFileContents(fileContents: Record<string, string>, entryIds: Set<string>) {
  return Object.fromEntries(
    Object.entries(fileContents).filter(([fileId]) => !entryIds.has(fileId))
  );
}

function removeSnapshotVersions(snapshotVersions: Record<string, number>, entryIds: Set<string>) {
  return Object.fromEntries(
    Object.entries(snapshotVersions).filter(([fileId]) => !entryIds.has(fileId))
  );
}

function initializeProjectState(project: ProjectDetail) {
  const tree = buildFileTree(project.files);
  const fileContents = createFileContents(project.files);
  const snapshotVersions = createSnapshotVersions(project.files);
  const initialFile = findInitialOpenFile(project.files);

  return {
    projectId: String(project.id),
    projectName: project.name,
    projectStatus: "loaded" as const,
    projectErrorMessage: null,
    filesTree: tree,
    openFiles: initialFile ? [{ id: String(initialFile.id), name: initialFile.name }] : [],
    activeFileId: initialFile ? String(initialFile.id) : null,
    fileContents,
    snapshotVersions,
  };
}

export const useProjectEditorHook = create<ProjectEditorState>()((set, get) => ({
  projectId: null,
  projectName: "Project",
  projectStatus: "idle",
  projectErrorMessage: null,
  filesTree: [],
  activeSidebarTab: "files",
  sidebarOpen: true,
  editorOpen: true,
  previewOpen: true,
  wordWrap: true,
  editorInstance: null,
  openFiles: [],
  activeFileId: null,
  fileContents: {},
  snapshotVersions: {},
  isAiChatExpanded: false,
  aiChatPrompt: "",
  aiChatHistory: [],
  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab, sidebarOpen: true }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setEditorOpen: (open) =>
    set((state) => {
      if (!open && !state.previewOpen) {
        return state;
      }
      return { editorOpen: open };
    }),
  setPreviewOpen: (open) =>
    set((state) => {
      if (!open && !state.editorOpen) {
        return state;
      }
      return { previewOpen: open };
    }),
  toggleWordWrap: () => set((state) => ({ wordWrap: !state.wordWrap })),
  setEditorInstance: (editor) => set({ editorInstance: editor }),
  setAiChatExpanded: (expanded) => set({ isAiChatExpanded: expanded }),
  setAiChatPrompt: (value) => set({ aiChatPrompt: value }),
  submitAiChatPrompt: () =>
    set((state) => {
      const prompt = state.aiChatPrompt.trim();
      if (!prompt) {
        return state;
      }

      const nextHistory = [prompt, ...state.aiChatHistory.filter((item) => item !== prompt)].slice(0, 10);

      return {
        aiChatPrompt: "",
        aiChatHistory: nextHistory,
        isAiChatExpanded: false,
      };
    }),
  initializeForViewport: (isMobile) =>
    set({
      sidebarOpen: !isMobile,
      editorOpen: true,
      previewOpen: !isMobile,
    }),
  loadProject: async (projectId) => {
    const { projectId: loadedProjectId, projectStatus } = get();

    if (loadedProjectId === projectId && projectStatus === "loaded") {
      return;
    }

    set({
      projectId,
      projectStatus: "loading",
      projectErrorMessage: null,
    });

    try {
      const { status, payload } = await requestApi<ProjectDetail>(`/api/projects/${projectId}`);

      if (status < 200 || status >= 300 || !payload.success || !payload.data) {
        set({
          projectStatus: "error",
          projectErrorMessage: payload.message ?? "Unable to load this project right now.",
        });
        return;
      }

      set(initializeProjectState(payload.data));
    } catch {
      set({
        projectStatus: "error",
        projectErrorMessage: "Unable to reach the project service. Please try again.",
      });
    }
  },
  openFile: (fileId, fileName) => set((state) => withOpenFile(state, fileId, fileName)),
  createEntry: async (parentId, type) => {
    const { projectId, filesTree } = get();

    if (!projectId) {
      return;
    }

    const name = getDefaultEntryName(filesTree, type);

    const { status, payload } = await postApi<ProjectFileEntry>(`/api/projects/${projectId}/files`, {
        name,
        type,
        parent_id: parentId ? Number(parentId) : null,
        mime_type: type === "file" ? "text/x-tex" : null,
        content: type === "file" ? "" : null,
    });

    if (status < 200 || status >= 300 || !payload.success || !payload.data) {
      set({
        projectErrorMessage: payload.message ?? "Unable to create a new entry right now.",
      });
      return;
    }

    const newEntry = payload.data;
    const fileNode = createFileNode(newEntry);

    set((state) => {
      const nextFilesTree = addNode(state.filesTree, parentId ?? "root", fileNode);

      if (newEntry.type === "folder") {
        return {
          filesTree: nextFilesTree,
          projectErrorMessage: null,
        };
      }

      const fileId = String(newEntry.id);
      const nextState = withOpenFile(
        {
          ...state,
          filesTree: nextFilesTree,
          fileContents: {
            ...state.fileContents,
            [fileId]: newEntry.content ?? "",
          },
          snapshotVersions: {
            ...state.snapshotVersions,
            [fileId]: newEntry.snapshot_version ?? 0,
          },
        },
        fileId,
        newEntry.name
      );

      return {
        filesTree: nextFilesTree,
        projectErrorMessage: null,
        openFiles: nextState.openFiles,
        activeFileId: nextState.activeFileId,
        fileContents: {
          ...nextState.fileContents,
          [fileId]: newEntry.content ?? "",
        },
        snapshotVersions: {
          ...state.snapshotVersions,
          [fileId]: newEntry.snapshot_version ?? 0,
        },
      };
    });
  },
  renameProject: async (name) => {
    const { projectId } = get();

    if (!projectId) {
      return false;
    }

    const { status, payload } = await requestApi<{ name: string }>(`/api/projects/${projectId}`, {
      method: "PATCH",
      body: { name },
    });

    if (status < 200 || status >= 300 || !payload.success || !payload.data) {
      set({
        projectErrorMessage: payload.message ?? "Unable to rename this project right now.",
      });
      return false;
    }

    set({
      projectName: payload.data.name,
      projectErrorMessage: null,
    });
    return true;
  },
  renameEntry: async (entryId, name) => {
    const { projectId } = get();

    if (!projectId) {
      return false;
    }

    const { status, payload } = await requestApi<ProjectFileEntry>(`/api/projects/${projectId}/files/${entryId}`, {
      method: "PATCH",
      body: { name },
    });

    if (status < 200 || status >= 300 || !payload.success || !payload.data) {
      set({
        projectErrorMessage: payload.message ?? "Unable to rename this entry right now.",
      });
      return false;
    }

    const renamedEntry = payload.data;

    set((state) => ({
      filesTree: updateNode(state.filesTree, entryId, (node) => ({
        ...node,
        name: renamedEntry.name,
      })),
      openFiles:
        renamedEntry.type === "file"
          ? renameOpenFiles(state.openFiles, entryId, renamedEntry.name)
          : state.openFiles,
      projectErrorMessage: null,
    }));
    return true;
  },
  deleteEntry: async (entryId) => {
    const { projectId, filesTree } = get();

    if (!projectId) {
      return false;
    }

    const deletedEntryIds = new Set(collectDescendantIds(filesTree, entryId));
    if (deletedEntryIds.size === 0) {
      return false;
    }

    const { status, payload } = await requestApi<null>(`/api/projects/${projectId}/files/${entryId}`, {
      method: "DELETE",
    });

    if (status < 200 || status >= 300 || !payload.success) {
      set({
        projectErrorMessage: payload.message ?? "Unable to delete this entry right now.",
      });
      return false;
    }

    set((state) => {
      const nextOpenFiles = state.openFiles.filter((file) => !deletedEntryIds.has(file.id));
      const isActiveFileDeleted = state.activeFileId ? deletedEntryIds.has(state.activeFileId) : false;

      return {
        filesTree: deleteNode(state.filesTree, entryId),
        openFiles: nextOpenFiles,
        activeFileId: isActiveFileDeleted ? (nextOpenFiles.at(-1)?.id ?? null) : state.activeFileId,
        fileContents: removeFileContents(state.fileContents, deletedEntryIds),
        snapshotVersions: removeSnapshotVersions(state.snapshotVersions, deletedEntryIds),
        projectErrorMessage: null,
      };
    });
    return true;
  },
  createUntitledFile: async () => {
    await get().createEntry(null, "file");
  },
  closeFile: (fileId) =>
    set((state) => {
      const index = state.openFiles.findIndex((file) => file.id === fileId);
      if (index < 0) {
        return state;
      }

      const nextOpenFiles = state.openFiles.filter((file) => file.id !== fileId);
      let nextActiveFileId = state.activeFileId;

      if (state.activeFileId === fileId) {
        if (nextOpenFiles.length === 0) {
          nextActiveFileId = null;
        } else {
          const fallbackIndex = Math.max(0, index - 1);
          nextActiveFileId = nextOpenFiles[fallbackIndex]?.id ?? nextOpenFiles[0].id;
        }
      }

      return {
        openFiles: nextOpenFiles,
        activeFileId: nextActiveFileId,
      };
    }),
  setActiveFile: (fileId) => set({ activeFileId: fileId }),
  setActiveFileContent: (value) =>
    set((state) => {
      if (!state.activeFileId) {
        return state;
      }

      return {
        fileContents: {
          ...state.fileContents,
          [state.activeFileId]: value,
        },
      };
    }),
  setFileContent: (fileId, value) =>
    set((state) => ({
      fileContents: {
        ...state.fileContents,
        [fileId]: value,
      },
    })),
  setFileSnapshotVersion: (fileId, version) =>
    set((state) => ({
      snapshotVersions: {
        ...state.snapshotVersions,
        [fileId]: version,
      },
    })),
  saveActiveFile: () => {
    if (typeof window === "undefined") {
      return;
    }

    const { activeFileId, openFiles, fileContents } = get();
    if (!activeFileId) {
      return;
    }

    const activeFile = openFiles.find((file) => file.id === activeFileId);
    if (!activeFile) {
      return;
    }

    const content = fileContents[activeFileId] ?? "";
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = activeFile.name;
    anchor.click();
    URL.revokeObjectURL(url);
  },
  cutSelection: async () => {
    const editor = get().editorInstance;
    if (!editor) {
      return;
    }
    await editor.getAction("editor.action.clipboardCutAction")?.run();
  },
  copySelection: async () => {
    const editor = get().editorInstance;
    if (!editor) {
      return;
    }
    await editor.getAction("editor.action.clipboardCopyAction")?.run();
  },
  pasteSelection: async () => {
    const editor = get().editorInstance;
    if (!editor) {
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      get().insertSnippet(text);
    } catch {
      await editor.getAction("editor.action.clipboardPasteAction")?.run();
    }
  },
  insertSnippet: (textToInsert) => {
    const editor = get().editorInstance;
    if (!editor) {
      return;
    }

    const selection = editor.getSelection();
    if (!selection) {
      return;
    }

    editor.executeEdits("insert-snippet", [
      {
        range: selection,
        text: textToInsert,
        forceMoveMarkers: true,
      },
    ]);
    editor.focus();
  },
}));
