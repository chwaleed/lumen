"use client";

import { useCallback, useState } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import type { SelectionPopupState } from "@/app/project/[id]/components/selection-action-popup";
import { useProjectEditorHook } from "@/app/project/[id]/use-project-editor-hook";

const POPUP_WIDTH = 256;
const POPUP_HEIGHT = 150;
const VIEWPORT_MARGIN = 8;
const EDITOR_SAFE_TOP = 56;

const ACTION_PREFIXES = {
  "Proof read": "Proof read this selection:\n",
  Rewrite: "Rewrite this selection:\n",
  Improve: "Improve this selection:\n",
} as const;

export type SelectionAction = keyof typeof ACTION_PREFIXES;

const HIDDEN_POPUP: SelectionPopupState = { show: false, x: 0, y: 0, text: "" };

export function useEditorSelection() {
  const setAiChatPrompt = useProjectEditorHook((state) => state.setAiChatPrompt);
  const setAiChatExpanded = useProjectEditorHook((state) => state.setAiChatExpanded);

  const [popup, setPopup] = useState<SelectionPopupState>(HIDDEN_POPUP);
  const [prompt, setPrompt] = useState("");

  const clear = useCallback(() => {
    setPopup((previous) => ({ ...previous, show: false }));
  }, []);

  const showForEditor = useCallback(
    (editor: MonacoEditor.IStandaloneCodeEditor) => {
      const selection = editor.getSelection();
      if (!selection || selection.isEmpty()) {
        clear();
        return;
      }

      const selectedText = editor.getModel()?.getValueInRange(selection) ?? "";
      const position = editor.getScrolledVisiblePosition(selection.getEndPosition());
      const domNode = editor.getDomNode();

      if (!position || !domNode || !selectedText.trim()) {
        clear();
        return;
      }

      const rect = domNode.getBoundingClientRect();
      const anchorX = rect.left + position.left;
      const anchorY = rect.top + position.top;
      const safeTop = rect.top + EDITOR_SAFE_TOP;

      const left = Math.min(
        Math.max(anchorX, VIEWPORT_MARGIN),
        window.innerWidth - POPUP_WIDTH - VIEWPORT_MARGIN,
      );

      // Prefer rendering above the selection, but fall below when there is no room.
      const topAbove = anchorY - POPUP_HEIGHT - VIEWPORT_MARGIN;
      const top = topAbove >= safeTop ? topAbove : anchorY + VIEWPORT_MARGIN;
      const clampedTop = Math.min(
        Math.max(top, safeTop),
        window.innerHeight - POPUP_HEIGHT - VIEWPORT_MARGIN,
      );

      setPopup({ show: true, x: left, y: clampedTop, text: selectedText });
    },
    [clear],
  );

  const runAction = (action: SelectionAction) => {
    if (!popup.text.trim()) {
      return;
    }

    setAiChatPrompt(`${ACTION_PREFIXES[action]}${popup.text}`);
    setAiChatExpanded(true);
    clear();
  };

  const submitPrompt = () => {
    const trimmedPrompt = prompt.trim();
    if (!popup.text.trim() || !trimmedPrompt) {
      return;
    }

    setAiChatPrompt(`${trimmedPrompt}\n\nSelected text:\n${popup.text}`);
    setAiChatExpanded(true);
    setPrompt("");
    clear();
  };

  return { popup, prompt, setPrompt, clear, showForEditor, runAction, submitPrompt };
}

export type EditorSelection = ReturnType<typeof useEditorSelection>;
