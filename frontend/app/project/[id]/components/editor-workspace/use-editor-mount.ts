"use client";

import { useCallback, useEffect, useRef } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import { useProjectEditorHook } from "@/app/project/[id]/use-project-editor-hook";

const FIND_WIDGET_TOOLTIP_ATTRIBUTES = ["title", "data-title", "data-tooltip", "aria-label"];

const FIND_WIDGET_TOOLTIP_SELECTOR = FIND_WIDGET_TOOLTIP_ATTRIBUTES.map(
  (attribute) => `.monaco-editor .find-widget [${attribute}]`,
).join(", ");

// Monaco's find widget ships its own native tooltips, which clash with the app's.
function stripFindWidgetTooltips() {
  document.querySelectorAll(FIND_WIDGET_TOOLTIP_SELECTOR).forEach((element) => {
    FIND_WIDGET_TOOLTIP_ATTRIBUTES.forEach((attribute) => element.removeAttribute(attribute));
  });
}

// Monaco MouseTargetType: 6 = CONTENT_TEXT, 7 = CONTENT_EMPTY.
const CONTENT_TARGET_TYPES = [6, 7];

type UseEditorMountOptions = {
  onClearSelection: () => void;
  onShowSelection: (editor: MonacoEditor.IStandaloneCodeEditor) => void;
};

export function useEditorMount({ onClearSelection, onShowSelection }: UseEditorMountOptions) {
  const setEditorInstance = useProjectEditorHook((state) => state.setEditorInstance);

  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const findWidgetObserverRef = useRef<MutationObserver | null>(null);
  const isPointerSelectingRef = useRef(false);
  const isContentSelectionRef = useRef(false);

  useEffect(() => {
    return () => {
      setEditorInstance(null);
      findWidgetObserverRef.current?.disconnect();
      findWidgetObserverRef.current = null;
    };
  }, [setEditorInstance]);

  const handleEditorMount = useCallback(
    (editor: MonacoEditor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      setEditorInstance(editor);

      stripFindWidgetTooltips();
      findWidgetObserverRef.current?.disconnect();
      const observer = new MutationObserver(stripFindWidgetTooltips);
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: FIND_WIDGET_TOOLTIP_ATTRIBUTES,
      });
      findWidgetObserverRef.current = observer;

      editor.onDidChangeModelContent((event) => {
        const { activeFileId, setFileContent, appendPendingSnapshotChanges } =
          useProjectEditorHook.getState();

        if (!activeFileId || event.isFlush) {
          return;
        }

        setFileContent(activeFileId, editor.getValue());
        appendPendingSnapshotChanges(
          activeFileId,
          event.changes.map((change) => ({
            range_offset: change.rangeOffset,
            range_length: change.rangeLength,
            text: change.text,
          })),
        );
      });

      editor.onMouseDown((event) => {
        const isContentTarget = CONTENT_TARGET_TYPES.includes(event.target.type as number);
        isPointerSelectingRef.current = isContentTarget;
        isContentSelectionRef.current = isContentTarget;
        if (isContentTarget) {
          onClearSelection();
        }
      });

      editor.onMouseUp(() => {
        const wasSelectingContent =
          isPointerSelectingRef.current && isContentSelectionRef.current;

        isPointerSelectingRef.current = false;
        isContentSelectionRef.current = false;

        if (wasSelectingContent) {
          onShowSelection(editor);
        }
      });
    },
    [onClearSelection, onShowSelection, setEditorInstance],
  );

  return handleEditorMount;
}
