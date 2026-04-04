"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { ArrowUp, Eye, History, PanelLeftOpen, RefreshCw, Search, Sparkles, Wand2, X } from "lucide-react";
import { EditorSidebar } from "@/components/editor-sidebar";
import { useThemeStore } from "@/lib/stores/theme-store";
import { ActivityBar } from "@/app/project/[id]/components/activity-bar";
import { EditorTopBar } from "@/app/project/[id]/components/editor-top-bar";
import { PreviewPanel } from "@/app/project/[id]/components/preview-panel";
import { StatusBar } from "@/app/project/[id]/components/status-bar";
import { useProjectEditorHook } from "@/app/project/[id]/use-project-editor-hook";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function EditorWorkspace() {
  const router = useRouter();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const activeSidebarTab = useProjectEditorHook((state) => state.activeSidebarTab);
  const sidebarOpen = useProjectEditorHook((state) => state.sidebarOpen);
  const editorOpen = useProjectEditorHook((state) => state.editorOpen);
  const previewOpen = useProjectEditorHook((state) => state.previewOpen);
  const latexCode = useProjectEditorHook((state) => state.latexCode);
  const searchQuery = useProjectEditorHook((state) => state.searchQuery);
  const replaceQuery = useProjectEditorHook((state) => state.replaceQuery);
  const setActiveSidebarTab = useProjectEditorHook((state) => state.setActiveSidebarTab);
  const setSidebarOpen = useProjectEditorHook((state) => state.setSidebarOpen);
  const setEditorOpen = useProjectEditorHook((state) => state.setEditorOpen);
  const setPreviewOpen = useProjectEditorHook((state) => state.setPreviewOpen);
  const setLatexCode = useProjectEditorHook((state) => state.setLatexCode);
  const setSearchQuery = useProjectEditorHook((state) => state.setSearchQuery);
  const setReplaceQuery = useProjectEditorHook((state) => state.setReplaceQuery);
  const isAiChatExpanded = useProjectEditorHook((state) => state.isAiChatExpanded);
  const aiChatPrompt = useProjectEditorHook((state) => state.aiChatPrompt);
  const aiChatHistory = useProjectEditorHook((state) => state.aiChatHistory);
  const setAiChatExpanded = useProjectEditorHook((state) => state.setAiChatExpanded);
  const setAiChatPrompt = useProjectEditorHook((state) => state.setAiChatPrompt);
  const submitAiChatPrompt = useProjectEditorHook((state) => state.submitAiChatPrompt);
  const initializeForViewport = useProjectEditorHook((state) => state.initializeForViewport);

  const [isMobile, setIsMobile] = useState(false);
  const [selectionPopup, setSelectionPopup] = useState({
    show: false,
    x: 0,
    y: 0,
    text: "",
  });
  const [selectionPrompt, setSelectionPrompt] = useState("");
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const isPointerSelectingRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const sync = () => {
      const mobile = media.matches;
      setIsMobile(mobile);
      initializeForViewport(mobile);
    };

    sync();
    media.addEventListener("change", sync);

    return () => {
      media.removeEventListener("change", sync);
    };
  }, [initializeForViewport]);

  const isDarkMode = theme === "dark";

  const handleFindNext = () => {
    if (!searchQuery || !editorRef.current) {
      return;
    }

    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) {
      return;
    }

    const currentPosition = editor.getPosition() ?? model.getFullModelRange().getStartPosition();
    const match = model.findNextMatch(searchQuery, currentPosition, false, false, null, false);
    if (!match) {
      return;
    }

    editor.setSelection(match.range);
    editor.revealRangeInCenter(match.range);
    editor.focus();
  };

  const handleReplaceAll = () => {
    if (!searchQuery) {
      return;
    }

    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escapedQuery, "g");
    setLatexCode(latexCode.replace(pattern, replaceQuery));
  };

  const previewSize = useMemo(() => (sidebarOpen ? 40 : 50), [sidebarOpen]);
  const SELECTION_POPUP_WIDTH = 256;
  const SELECTION_POPUP_HEIGHT = 150;
  const VIEWPORT_MARGIN = 8;

  const showSelectionPopup = (editor: MonacoEditor.IStandaloneCodeEditor) => {
    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) {
      setSelectionPopup((prev) => ({ ...prev, show: false }));
      return;
    }

    const selectedText = editor.getModel()?.getValueInRange(selection) ?? "";
    const position = editor.getScrolledVisiblePosition(selection.getEndPosition());
    const domNode = editor.getDomNode();

    if (!position || !domNode || !selectedText.trim()) {
      setSelectionPopup((prev) => ({ ...prev, show: false }));
      return;
    }

    const rect = domNode.getBoundingClientRect();
    const anchorX = rect.left + position.left;
    const anchorY = rect.top + position.top;

    const left = Math.min(
      Math.max(anchorX, VIEWPORT_MARGIN),
      window.innerWidth - SELECTION_POPUP_WIDTH - VIEWPORT_MARGIN,
    );

    const topAbove = anchorY - SELECTION_POPUP_HEIGHT - VIEWPORT_MARGIN;
    const topBelow = anchorY + VIEWPORT_MARGIN;
    const top = topAbove >= VIEWPORT_MARGIN ? topAbove : topBelow;
    const clampedTop = Math.min(
      Math.max(top, VIEWPORT_MARGIN),
      window.innerHeight - SELECTION_POPUP_HEIGHT - VIEWPORT_MARGIN,
    );

    setSelectionPopup({
      show: true,
      x: left,
      y: clampedTop,
      text: selectedText,
    });
  };

  const handleSelectionAction = (action: "Proof read" | "Rewrite" | "Improve") => {
    if (!selectionPopup.text.trim()) {
      return;
    }

    const prefix =
      action === "Proof read"
        ? "Proof read this selection:\n"
        : action === "Rewrite"
          ? "Rewrite this selection:\n"
          : "Improve this selection:\n";
    setAiChatPrompt(`${prefix}${selectionPopup.text}`);
    setAiChatExpanded(true);
    setSelectionPopup((prev) => ({ ...prev, show: false }));
  };

  const handleSelectionPromptSubmit = () => {
    if (!selectionPopup.text.trim()) {
      return;
    }

    const prompt = selectionPrompt.trim();
    if (!prompt) {
      return;
    }

    setAiChatPrompt(`${prompt}\n\nSelected text:\n${selectionPopup.text}`);
    setAiChatExpanded(true);
    setSelectionPrompt("");
    setSelectionPopup((prev) => ({ ...prev, show: false }));
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <EditorTopBar
        isDarkMode={isDarkMode}
        toggleTheme={() => setTheme(isDarkMode ? "light" : "dark")}
        sidebarOpen={sidebarOpen}
        editorOpen={editorOpen}
        previewOpen={previewOpen}
        setSidebarOpen={setSidebarOpen}
        setEditorOpen={setEditorOpen}
        setPreviewOpen={setPreviewOpen}
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ActivityBar
          activeSidebarTab={activeSidebarTab}
          sidebarOpen={sidebarOpen}
          setActiveSidebarTab={setActiveSidebarTab}
          setSidebarOpen={setSidebarOpen}
        />

        {isMobile && sidebarOpen ? (
          <div className="absolute inset-0 z-10 bg-background/70" onClick={() => setSidebarOpen(false)} />
        ) : null}

        <EditorSidebar
          activeSidebarTab={activeSidebarTab}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          replaceQuery={replaceQuery}
          setReplaceQuery={setReplaceQuery}
          handleFindNext={handleFindNext}
          handleReplaceAll={handleReplaceAll}
        />

        <div className="min-w-0 flex-1 overflow-hidden">
          <ResizablePanelGroup orientation={isMobile ? "vertical" : "horizontal"} className="h-full w-full">
            {editorOpen ? (
              <ResizablePanel defaultSize={previewOpen ? 60 : 100} minSize={30}>
                <div className="relative flex h-full flex-col bg-background">
                  <div className="flex items-center justify-between border-b bg-muted/20 px-3 py-2">
                    <div className="inline-flex items-center gap-2 text-sm font-medium">
                      {!sidebarOpen ? (
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => setSidebarOpen(true)}>
                          <PanelLeftOpen className="size-4" />
                        </Button>
                      ) : null}
                      <span>main.tex</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="size-7" onClick={handleFindNext}>
                        <Search className="size-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
                        Back
                      </Button>
                    </div>
                  </div>
                  <Editor
                    height="100%"
                    language="latex"
                    theme={isDarkMode ? "vs-dark" : "light"}
                    value={latexCode}
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
                    onMount={(editor) => {
                      editorRef.current = editor;

                      editor.onMouseDown(() => {
                        isPointerSelectingRef.current = true;
                        setSelectionPopup((prev) => ({ ...prev, show: false }));
                      });

                      editor.onMouseUp(() => {
                        isPointerSelectingRef.current = false;
                        showSelectionPopup(editor);
                      });

                      editor.onDidChangeCursorSelection(() => {
                        if (isPointerSelectingRef.current) {
                          return;
                        }
                        showSelectionPopup(editor);
                      });
                    }}
                    onChange={(value) => setLatexCode(value ?? "")}
                    options={{
                      wordWrap: "on",
                      fontSize: 14,
                      tabSize: 2,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      lineNumbers: "on",
                      renderLineHighlight: "all",
                    }}
                  />

                  {selectionPopup.show ? (
                    <div
                      className="fixed z-30 w-64 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl"
                      style={{
                        top: selectionPopup.y,
                        left: selectionPopup.x,
                      }}
                    >
                      <div className="border-b border-border/50 bg-muted/30 p-2">
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            placeholder="Enter prompt"
                            className="h-8 w-full bg-transparent pr-8 text-sm outline-none"
                            value={selectionPrompt}
                            onChange={(event) => setSelectionPrompt(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                handleSelectionPromptSubmit();
                              }
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute right-0 size-8 text-muted-foreground hover:text-foreground"
                            onClick={handleSelectionPromptSubmit}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 p-1">
                        <Button
                          variant="ghost"
                          className="h-9 justify-start px-2 text-sm font-normal text-muted-foreground hover:text-foreground"
                          onClick={() => handleSelectionAction("Proof read")}
                        >
                          <Eye className="mr-2 size-4" />
                          Proof read
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-9 justify-start px-2 text-sm font-normal text-muted-foreground hover:text-foreground"
                          onClick={() => handleSelectionAction("Rewrite")}
                        >
                          <RefreshCw className="mr-2 size-4" />
                          Rewrite
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-9 justify-start px-2 text-sm font-normal text-muted-foreground hover:text-foreground"
                          onClick={() => handleSelectionAction("Improve")}
                        >
                          <Wand2 className="mr-2 size-4" />
                          Improve
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div
                    className={`absolute bottom-6 right-6 z-20 overflow-hidden shadow-lg transition-all duration-300 ${
                      isAiChatExpanded
                        ? "h-14 w-[calc(100%-3rem)] rounded-2xl border bg-background md:w-[450px]"
                        : "size-12 rounded-full"
                    }`}
                  >
                    {!isAiChatExpanded ? (
                      <Button size="icon" className="size-12 rounded-full" onClick={() => setAiChatExpanded(true)}>
                        <Sparkles className="size-5" />
                      </Button>
                    ) : (
                      <div className="flex h-full items-center gap-2 px-2">
                        <Sparkles className="ml-2 size-5 text-primary" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Ask AI to edit or chat with doc..."
                          className="flex-1 bg-transparent text-sm outline-none"
                          value={aiChatPrompt}
                          onChange={(event) => setAiChatPrompt(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              submitAiChatPrompt();
                            }
                          }}
                        />

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-full"
                              disabled={aiChatHistory.length === 0}
                            >
                              <History className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Prompt History</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {aiChatHistory.length === 0 ? (
                                <div className="p-2 text-center text-sm text-muted-foreground">No history yet</div>
                              ) : (
                                aiChatHistory.map((prompt, index) => (
                                  <DropdownMenuItem
                                    key={`${prompt}-${index}`}
                                    onClick={() => setAiChatPrompt(prompt)}
                                  >
                                    <span className="truncate">{prompt}</span>
                                  </DropdownMenuItem>
                                ))
                              )}
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button size="icon" className="size-8 rounded-full" onClick={submitAiChatPrompt}>
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-full"
                          onClick={() => setAiChatExpanded(false)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>
            ) : null}

            {editorOpen && previewOpen ? <ResizableHandle withHandle /> : null}

            {previewOpen ? (
              <ResizablePanel defaultSize={editorOpen ? previewSize : 100} minSize={30}>
                <PreviewPanel latexCode={latexCode} />
              </ResizablePanel>
            ) : null}
          </ResizablePanelGroup>
        </div>
      </div>

      <StatusBar />
    </div>
  );
}
