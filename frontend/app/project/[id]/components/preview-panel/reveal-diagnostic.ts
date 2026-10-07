import { findNodeByPath } from "@/lib/projects";
import { useProjectEditorHook } from "@/app/project/[id]/use-project-editor-hook";
import type { CompileDiagnostic } from "@/app/project/[id]/use-compile-hook";

/**
 * Open the file a diagnostic names and put the cursor on its line.
 *
 * Kept out of both stores: it only reads them. `use-project-editor-hook` is
 * already 895 lines, and this is the one place the compile view reaches into the
 * editor.
 */
export function revealDiagnostic(diagnostic: CompileDiagnostic): boolean {
  if (!diagnostic.file) {
    return false;
  }

  const { filesTree, openFile, editorInstance } = useProjectEditorHook.getState();
  const node = findNodeByPath(filesTree, diagnostic.file);

  if (!node) {
    return false;
  }

  openFile(node);

  if (diagnostic.line !== null && editorInstance) {
    // The tab may have only just been opened, so let the model attach first.
    requestAnimationFrame(() => {
      const editor = useProjectEditorHook.getState().editorInstance;
      if (!editor) {
        return;
      }
      editor.revealLineInCenter(diagnostic.line as number);
      editor.setPosition({ lineNumber: diagnostic.line as number, column: 1 });
      editor.focus();
    });
  }

  return true;
}
