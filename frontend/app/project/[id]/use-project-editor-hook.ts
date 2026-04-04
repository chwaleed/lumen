"use client";

import { create } from "zustand";

export type SidebarTab = "files" | "search" | "ai";

export type EditorFile = {
  id: string;
  name: string;
};

type ProjectEditorState = {
  activeSidebarTab: SidebarTab;
  sidebarOpen: boolean;
  editorOpen: boolean;
  previewOpen: boolean;
  openFiles: EditorFile[];
  activeFileId: string | null;
  fileContents: Record<string, string>;
  searchQuery: string;
  replaceQuery: string;
  isAiChatExpanded: boolean;
  aiChatPrompt: string;
  aiChatHistory: string[];
  setActiveSidebarTab: (tab: SidebarTab) => void;
  setSidebarOpen: (open: boolean) => void;
  setEditorOpen: (open: boolean) => void;
  setPreviewOpen: (open: boolean) => void;
  setSearchQuery: (value: string) => void;
  setReplaceQuery: (value: string) => void;
  setAiChatExpanded: (expanded: boolean) => void;
  setAiChatPrompt: (value: string) => void;
  submitAiChatPrompt: () => void;
  initializeForViewport: (isMobile: boolean) => void;
  openFile: (fileId: string, fileName: string) => void;
  createFile: (fileId: string, fileName: string) => void;
  renameFile: (fileId: string, fileName: string) => void;
  deleteFile: (fileId: string) => void;
  closeFile: (fileId: string) => void;
  setActiveFile: (fileId: string) => void;
  setActiveFileContent: (value: string) => void;
};

const DEFAULT_LATEX = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}

\\title{AI-Powered LaTeX Editor}
\\author{User}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
Welcome to your new AI-powered LaTeX editor. Start typing your document here.

\\subsection{Mathematics}
You can easily write complex equations:
\\begin{equation}
E = mc^2
\\end{equation}

\\section{Conclusion}
This is a placeholder for the live preview.

\\end{document}`;

const DEFAULT_BIB = `@article{sample2026,
  title={Sample Reference},
  author={Doe, Jane},
  journal={Journal of TeX},
  year={2026}
}`;

const DEFAULT_OPEN_FILES: EditorFile[] = [{ id: "1", name: "main.tex" }];

const DEFAULT_FILE_CONTENTS: Record<string, string> = {
  "1": DEFAULT_LATEX,
  "2": DEFAULT_BIB,
  "4": "",
};

function withFile(state: ProjectEditorState, fileId: string, fileName: string) {
  const hasOpenTab = state.openFiles.some((file) => file.id === fileId);
  const openFiles = hasOpenTab ? state.openFiles : [...state.openFiles, { id: fileId, name: fileName }];
  const fileContents = state.fileContents[fileId]
    ? state.fileContents
    : { ...state.fileContents, [fileId]: "" };

  return {
    openFiles,
    activeFileId: fileId,
    fileContents,
  };
}

export const useProjectEditorHook = create<ProjectEditorState>()((set) => ({
  activeSidebarTab: "files",
  sidebarOpen: true,
  editorOpen: true,
  previewOpen: true,
  openFiles: DEFAULT_OPEN_FILES,
  activeFileId: "1",
  fileContents: DEFAULT_FILE_CONTENTS,
  searchQuery: "",
  replaceQuery: "",
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
  setSearchQuery: (value) => set({ searchQuery: value }),
  setReplaceQuery: (value) => set({ replaceQuery: value }),
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
  openFile: (fileId, fileName) => set((state) => withFile(state, fileId, fileName)),
  createFile: (fileId, fileName) => set((state) => withFile(state, fileId, fileName)),
  renameFile: (fileId, fileName) =>
    set((state) => ({
      openFiles: state.openFiles.map((file) => (file.id === fileId ? { ...file, name: fileName } : file)),
    })),
  deleteFile: (fileId) =>
    set((state) => {
      const nextOpenFiles = state.openFiles.filter((file) => file.id !== fileId);
      const nextFileContents = { ...state.fileContents };
      delete nextFileContents[fileId];

      let nextActiveFileId = state.activeFileId;
      if (state.activeFileId === fileId) {
        nextActiveFileId = nextOpenFiles.length > 0 ? nextOpenFiles[Math.max(0, nextOpenFiles.length - 1)].id : null;
      }

      return {
        openFiles: nextOpenFiles,
        fileContents: nextFileContents,
        activeFileId: nextActiveFileId,
      };
    }),
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
}));
