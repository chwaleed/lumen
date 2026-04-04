import React from 'react';
import { 
  FileText, 
  X, 
  PanelLeftOpen, 
  Search, 
  Settings,
  ArrowUp,
  Eye,
  RefreshCw,
  Wand2,
  Sparkles,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import Editor from '@monaco-editor/react';

interface EditorPanelProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setEditorOpen: (open: boolean) => void;
  previewOpen: boolean;
  setPreviewOpen: (open: boolean) => void;
  latexCode: string;
  setLatexCode: (code: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  tabSize: number;
  setTabSize: (size: number) => void;
  wordWrap: boolean;
  setWordWrap: (wrap: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  replaceQuery: string;
  setReplaceQuery: (query: string) => void;
  handleFindNext: () => void;
  handleReplaceAll: () => void;
  isDarkMode: boolean;
  editorRef: React.MutableRefObject<any>;
  bubbleMenu: { show: boolean, x: number, y: number, text: string };
  setBubbleMenu: React.Dispatch<React.SetStateAction<{ show: boolean, x: number, y: number, text: string }>>;
  isAiChatExpanded: boolean;
  setIsAiChatExpanded: (expanded: boolean) => void;
  aiChatPrompt: string;
  setAiChatPrompt: (prompt: string) => void;
  aiChatHistory: string[];
  handleAiChatSubmit: () => void;
  handleEditorWillMount: (monaco: any) => void;
  handleEditorDidMount: (editor: any, monaco: any) => void;
  handleEditorChange: (value: string | undefined) => void;
}

export function EditorPanel({
  sidebarOpen,
  setSidebarOpen,
  setEditorOpen,
  previewOpen,
  setPreviewOpen,
  latexCode,
  setLatexCode,
  fontSize,
  setFontSize,
  tabSize,
  setTabSize,
  wordWrap,
  setWordWrap,
  searchQuery,
  setSearchQuery,
  replaceQuery,
  setReplaceQuery,
  handleFindNext,
  handleReplaceAll,
  isDarkMode,
  editorRef,
  bubbleMenu,
  setBubbleMenu,
  isAiChatExpanded,
  setIsAiChatExpanded,
  aiChatPrompt,
  setAiChatPrompt,
  aiChatHistory,
  handleAiChatSubmit,
  handleEditorWillMount,
  handleEditorDidMount,
  handleEditorChange
}: EditorPanelProps) {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center border-b bg-muted/20 overflow-x-auto scrollbar-hide">
        {!sidebarOpen && (
          <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 shrink-0" onClick={() => setSidebarOpen(true)}>
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        )}
        <div className="flex items-center px-4 py-2 bg-background border-r border-t-2 border-t-primary text-sm font-medium min-w-fit shrink-0">
          <FileText className="h-4 w-4 mr-2 text-blue-500" />
          main.tex
          <Badge variant="secondary" className="ml-2 text-[10px] px-1 py-0 h-4">Saved</Badge>
          <Button variant="ghost" size="icon" className="h-5 w-5 ml-2 opacity-50 hover:opacity-100"><X className="h-3 w-3" /></Button>
        </div>
        <div className="flex items-center px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 cursor-pointer min-w-fit border-r shrink-0">
          <FileText className="h-4 w-4 mr-2 text-orange-400" />
          references.bib
        </div>
        <div className="flex-1 min-w-[20px]"></div>
        <div className="flex items-center space-x-1 px-2 shrink-0">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Search className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Search Document</DialogTitle>
                <DialogDescription>
                  Find and replace text in your LaTeX document.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Input 
                    id="search" 
                    placeholder="Find..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Input 
                    id="replace" 
                    placeholder="Replace with..." 
                    value={replaceQuery}
                    onChange={(e) => setReplaceQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleFindNext}>Find Next</Button>
                <Button onClick={handleReplaceAll}>Replace All</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Editor Settings</DialogTitle>
                <DialogDescription>
                  Customize your LaTeX editing experience.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Font Size</span>
                  <Input 
                    type="number" 
                    value={fontSize} 
                    onChange={(e) => setFontSize(Number(e.target.value) || 14)}
                    className="w-20" 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tab Size</span>
                  <Input 
                    type="number" 
                    value={tabSize} 
                    onChange={(e) => setTabSize(Number(e.target.value) || 2)}
                    className="w-20" 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Word Wrap</span>
                  <Button variant="outline" size="sm" onClick={() => setWordWrap(!wordWrap)}>
                    {wordWrap ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Auto-compile</span>
                  <Button variant="outline" size="sm">On Save</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="flex-1 relative flex overflow-hidden">
        <Editor
          height="100%"
          language="latex"
          theme={isDarkMode ? "vs-dark" : "light"}
          value={latexCode}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          beforeMount={handleEditorWillMount}
          options={{
            wordWrap: wordWrap ? "on" : "off",
            fontSize: fontSize,
            tabSize: tabSize,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            renderLineHighlight: "all",
          }}
        />
        
        {/* Bubble Menu for Text Selection */}
        {bubbleMenu.show && (
          <div 
            className="fixed z-50 flex flex-col w-64 bg-popover text-popover-foreground border rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
            style={{ top: bubbleMenu.y, left: bubbleMenu.x, transform: 'translate(0, -100%)', marginTop: '-8px' }}
          >
            <div className="p-2 border-b border-border/50 bg-muted/30">
              <div className="relative flex items-center">
                <Input 
                  placeholder="Enter prompt" 
                  className="h-8 pr-8 bg-transparent border-0 focus-visible:ring-0 shadow-none text-sm"
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="absolute right-0 h-8 w-8 text-muted-foreground hover:text-foreground">
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-1 flex flex-col gap-0.5">
              <Button variant="ghost" className="w-full justify-start text-sm font-normal px-2 h-9 text-muted-foreground hover:text-foreground">
                <Eye className="h-4 w-4 mr-2" />
                Proof read
              </Button>
              <Button variant="ghost" className="w-full justify-start text-sm font-normal px-2 h-9 text-muted-foreground hover:text-foreground">
                <RefreshCw className="h-4 w-4 mr-2" />
                Rewrite
              </Button>
              <Button variant="ghost" className="w-full justify-start text-sm font-normal px-2 h-9 text-muted-foreground hover:text-foreground">
                <Wand2 className="h-4 w-4 mr-2" />
                Improve
              </Button>
            </div>
          </div>
        )}
        
        {/* Floating AI Action Button */}
        <div className={`absolute bottom-6 right-6 flex items-center transition-all duration-300 ease-in-out shadow-lg overflow-hidden ${
          isAiChatExpanded 
            ? 'w-[calc(100%-3rem)] md:w-[450px] rounded-2xl h-14 bg-background border border-border shadow-2xl' 
            : 'w-12 h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 justify-center'
        }`}>
          {!isAiChatExpanded ? (
            <Tooltip>
              <TooltipTrigger render={<button 
                  className="w-full h-full flex items-center justify-center outline-none p-0 m-0 bg-transparent border-none"
                  onClick={() => setIsAiChatExpanded(true)}
                />}>
                <Sparkles className="h-5 w-5" />
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Chat with AI</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center w-full h-full px-2 gap-2 animate-in fade-in duration-300 delay-150">
              <Sparkles className="h-5 w-5 text-primary ml-2 shrink-0" />
              <input 
                autoFocus
                type="text"
                placeholder="Ask AI to edit or chat with doc..."
                className="flex-1 bg-transparent border-0 focus:ring-0 text-sm px-2 outline-none text-foreground"
                value={aiChatPrompt}
                onChange={(e) => setAiChatPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAiChatSubmit();
                  }
                }}
              />
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full text-muted-foreground" disabled={aiChatHistory.length === 0} />}>
                  <History className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Prompt History</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {aiChatHistory.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">No history yet</div>
                    ) : (
                      aiChatHistory.map((prompt, index) => (
                        <DropdownMenuItem key={index} onClick={() => setAiChatPrompt(prompt)}>
                          <span className="truncate">{prompt}</span>
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={handleAiChatSubmit}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full text-muted-foreground" onClick={() => setIsAiChatExpanded(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
