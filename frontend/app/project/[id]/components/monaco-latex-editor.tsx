import Editor from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";

type MonacoLatexEditorProps = {
  value: string;
  isDarkMode: boolean;
  wordWrap: boolean;
  onMount: (editor: MonacoEditor.IStandaloneCodeEditor) => void;
};

export function MonacoLatexEditor({ value, isDarkMode, wordWrap, onMount }: MonacoLatexEditorProps) {
  return (
    <Editor
      height="100%"
      language="latex"
      theme={isDarkMode ? "vs-dark" : "light"}
      value={value}
      beforeMount={(monaco) => {
        if (!monaco.languages.getLanguages().some((lang: { id: string }) => lang.id === "latex")) {
          monaco.languages.register({ id: "latex" });
        }

        monaco.languages.setMonarchTokensProvider("latex", {
          tokenizer: {
            root: [
              [/\\begin\{[a-zA-Z0-9*]+\}/, "keyword.control.latex"],
              [/\\end\{[a-zA-Z0-9*]+\}/, "keyword.control.latex"],
              [/\\[a-zA-Z@]+/, "keyword.control.latex"],
              [/%.*$/, "comment.line.percentage"],
              [/\{|\}/, "delimiter.curly"],
              [/\[|\]/, "delimiter.square"],
              [/\$[^$]*\$/, "string.other.math.block"],
              [/\\\[/, "string.other.math.block"],
              [/\\\]/, "string.other.math.block"],
            ],
          },
        });

        monaco.languages.setLanguageConfiguration("latex", {
          comments: { lineComment: "%" },
          brackets: [
            ["{", "}"],
            ["[", "]"],
            ["(", ")"],
          ],
          autoClosingPairs: [
            { open: "{", close: "}" },
            { open: "[", close: "]" },
            { open: "(", close: ")" },
            { open: "$", close: "$" },
          ],
        });
      }}
      onMount={onMount}
      options={{
        wordWrap: wordWrap ? "on" : "off",
        fontSize: 14,
        tabSize: 2,
        minimap: { enabled: false },
        hover: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: "on",
        renderLineHighlight: "all",
      }}
    />
  );
}
