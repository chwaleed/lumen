"use client";

import type { editor as MonacoEditor } from "monaco-editor";
import { create } from "zustand";
import { addNode } from "@/components/editor-sidebar/file-tree-utils";
import type { FileNode } from "@/components/editor-sidebar";
import {
  buildFileTree,
  createFileContents,
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
  createUntitledFile: () => Promise<void>;
  closeFile: (fileId: string) => void;
  setActiveFile: (fileId: string) => void;
  setActiveFileContent: (value: string) => void;
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

function initializeProjectState(project: ProjectDetail) {
  const tree = buildFileTree(project.files);
  const fileContents = createFileContents(project.files);
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
      const response = await fetch(`/api/projects/${projectId}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        data?: ProjectDetail;
      };

      if (!response.ok || !data.success || !data.data) {
        set({
          projectStatus: "error",
          projectErrorMessage: data.message ?? "Unable to load this project right now.",
        });
        return;
      }

      set(initializeProjectState(data.data));
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

    const response = await fetch(`/api/projects/${projectId}/files`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        type,
        parent_id: parentId ? Number(parentId) : null,
        mime_type: type === "file" ? "text/x-tex" : null,
        content: type === "file" ? "" : null,
      }),
    });

    const data = (await response.json()) as {
      success?: boolean;
      message?: string;
      data?: ProjectFileEntry;
    };

    if (!response.ok || !data.success || !data.data) {
      set({
        projectErrorMessage: data.message ?? "Unable to create a new entry right now.",
      });
      return;
    }

    const newEntry = data.data;
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
        } as ProjectEditorState,
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
      };
    });
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
