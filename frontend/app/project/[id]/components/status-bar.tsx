"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useProjectEditorHook } from "@/app/project/[id]/use-project-editor-hook";
import { fileExtension } from "@/lib/projects";

const LANGUAGES: Record<string, string> = {
  ".tex": "LaTeX",
  ".ltx": "LaTeX",
  ".bib": "BibTeX",
  ".cls": "LaTeX class",
  ".sty": "LaTeX package",
  ".bst": "BibTeX style",
  ".txt": "Text",
};

// Commands whose braced argument is a name, not something the reader sees.
// \section{Intro} contributes a word; \begin{document} does not.
const NON_PROSE_COMMANDS =
  "begin|end|documentclass|usepackage|RequirePackage|label|ref|eqref|pageref|cite|" +
  "citep|citet|includegraphics|input|include|bibliography|bibliographystyle|" +
  "addbibresource|usetheme|geometry|hypersetup|pagestyle|bibitem";

/**
 * Words of prose, with LaTeX markup discounted. Exported for its test.
 *
 * Maths counts as nothing, the way texcount treats it: splitting `$x^2$` into
 * "x" and "2" inflates the number, and a thesis writer checking a word limit
 * is asking about prose.
 */
export function countWords(text: string) {
  const prose = text
    // Comments, but not an escaped \%.
    .replace(/(^|[^\\])%.*$/gm, "$1")
    // Maths, display first so its delimiters do not confuse the inline pass.
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\\\[[\s\S]*?\\\]/g, " ")
    .replace(/\\\([\s\S]*?\\\)/g, " ")
    .replace(/\$[^$]*\$/g, " ")
    // Commands whose argument is a name, argument and all.
    .replace(
      new RegExp(`\\\\(?:${NON_PROSE_COMMANDS})\\s*(?:\\[[^\\]]*\\])?\\s*(?:\\{[^}]*\\})?`, "g"),
      " ",
    )
    // Every other command, keeping its argument: \textbf{word} is a word.
    .replace(/\\[a-zA-Z@]+\s*(?:\[[^\]]*\])?/g, " ")
    .replace(/[{}&~\\]/g, " ");

  const matches = prose.match(/\S+/g);
  return matches ? matches.length : 0;
}

/**
 * The editor's status line.
 *
 * Every value here used to be a literal -- "Ln 14, Col 23", "Words: 42",
 * "Ready" -- shown identically whatever file was open and whatever state the
 * project was in. Numbers that never change are worse than no numbers: they
 * teach people the interface is decorative.
 */
export function StatusBar() {
  const editorInstance = useProjectEditorHook((state) => state.editorInstance);
  const activeFileId = useProjectEditorHook((state) => state.activeFileId);
  const openFiles = useProjectEditorHook((state) => state.openFiles);
  const fileContents = useProjectEditorHook((state) => state.fileContents);
  const savedFileContents = useProjectEditorHook((state) => state.savedFileContents);

  // Monaco owns the cursor; useSyncExternalStore is how React reads a source
  // it does not control, without an effect that sets state on every change.
  // The snapshot is a string so repeated reads compare equal.
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!editorInstance) {
        return () => {};
      }
      const subscription = editorInstance.onDidChangeCursorPosition(onChange);
      return () => subscription.dispose();
    },
    [editorInstance],
  );
  const snapshot = useCallback(() => {
    const position = editorInstance?.getPosition();
    return position ? `${position.lineNumber}:${position.column}` : "";
  }, [editorInstance]);
  const serverSnapshot = useCallback(() => "", []);

  const cursorKey = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const cursor = cursorKey
    ? {
        line: Number(cursorKey.split(":")[0]),
        column: Number(cursorKey.split(":")[1]),
      }
    : null;

  const activeFile = openFiles.find((file) => file.id === activeFileId) ?? null;
  const content = activeFileId ? fileContents[activeFileId] ?? "" : "";
  const words = useMemo(() => countWords(content), [content]);

  const isTextFile = Boolean(activeFile) && cursor !== null;
  const hasUnsavedEdits =
    activeFileId !== null && content !== (savedFileContents[activeFileId] ?? content);
  const language = activeFile ? LANGUAGES[fileExtension(activeFile.name)] : null;

  return (
    <footer className="flex items-center justify-between border-t bg-card px-4 py-1 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center gap-2">
          <span
            className={`size-2 rounded-full ${hasUnsavedEdits ? "bg-amber-500" : "bg-primary"}`}
          />
          {hasUnsavedEdits ? "Unsaved changes" : "Saved"}
        </span>
        {isTextFile ? <span className="hidden sm:inline">UTF-8</span> : null}
        {language ? <span className="hidden sm:inline">{language}</span> : null}
      </div>

      <div className="flex items-center gap-4">
        {cursor ? (
          <span>
            Ln {cursor.line}, Col {cursor.column}
          </span>
        ) : null}
        {isTextFile ? (
          <span className="hidden sm:inline">
            {words === 1 ? "1 word" : `${words.toLocaleString()} words`}
          </span>
        ) : null}
      </div>
    </footer>
  );
}
