import React, { useState, useRef, useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Login } from '@/components/Login';
import { Signup } from '@/components/Signup';

import { Header } from '@/components/Header';
import { ActivityBar } from '@/components/ActivityBar';
import { EditorSidebar } from '@/src/editor/components/EditorSidebar';
import { EditorPanel } from '@/components/EditorPanel';
import { PreviewPanel } from '@/components/PreviewPanel';
import StatusBar from '@/components/StatusBar';
import { useMediaQuery } from '@/src/hooks/use-media-query';
import DashboardPage from '@/src/dashboard/dashboard';
import ProjectsPage from '@/src/projects/projects';
import TemplatesPage from '@/src/templates/templates';
import { AppShellProvider } from '@/src/shared/AppShellContext';

export default function App() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState('files');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editorOpen, setEditorOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(true);
  
  // Auto-close sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
      if (editorOpen && previewOpen) {
        setPreviewOpen(false);
      }
    } else {
      setSidebarOpen(true);
      setEditorOpen(true);
      setPreviewOpen(true);
    }
  }, [isMobile]);
  
  const handleSetEditorOpen = (open: boolean) => {
    if (!open && !previewOpen) return;
    setEditorOpen(open);
  };

  const handleSetPreviewOpen = (open: boolean) => {
    if (!open && !editorOpen) return;
    setPreviewOpen(open);
  };
  
  // Auth State
  const [user, setUser] = useState<{name: string, email: string, avatar: string} | null>(null);
  const [latexCode, setLatexCode] = useState(`\\documentclass{article}
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

\\end{document}`);

  const [bubbleMenu, setBubbleMenu] = useState({ show: false, x: 0, y: 0, text: '' });
  
  // AI Chat State
  const [isAiChatExpanded, setIsAiChatExpanded] = useState(false);
  const [aiChatPrompt, setAiChatPrompt] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState<string[]>([]);
  
  // Editor Settings State
  const [fontSize, setFontSize] = useState(14);
  const [tabSize, setTabSize] = useState(2);
  const [wordWrap, setWordWrap] = useState(true);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  
  const editorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleSetCurrentView = (view: 'editor' | 'login' | 'signup' | 'projects') => {
    const routeMap: Record<'editor' | 'login' | 'signup' | 'projects', string> = {
      editor: '/project/new',
      login: '/login',
      signup: '/signup',
      projects: '/projects',
    };
    navigate(routeMap[view]);
  };

  const handleEditorWillMount = (monaco: any) => {
    if (!monaco.languages.getLanguages().some((l: any) => l.id === 'latex')) {
      monaco.languages.register({ id: 'latex' });
      monaco.languages.setMonarchTokensProvider('latex', {
        tokenizer: {
          root: [
            [/\\begin\{[a-zA-Z0-9*]+\}/, 'keyword.control.latex'],
            [/\\end\{[a-zA-Z0-9*]+\}/, 'keyword.control.latex'],
            [/\\[a-zA-Z@]+/, 'keyword.control.latex'],
            [/%.*$/, 'comment.line.percentage'],
            [/\{|\}/, 'delimiter.curly'],
            [/\[|\]/, 'delimiter.square'],
            [/\$[^$]*\$/, 'string.other.math.block'],
            [/\\\[/, 'string.other.math.block'],
            [/\\\]/, 'string.other.math.block'],
          ]
        }
      });
      monaco.languages.setLanguageConfiguration('latex', {
        comments: {
          lineComment: '%',
        },
        brackets: [
          ['{', '}'],
          ['[', ']'],
          ['(', ')'],
        ],
        autoClosingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '$', close: '$' },
        ],
      });
    }
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    editor.onDidChangeCursorSelection((e: any) => {
      const selection = editor.getSelection();
      if (!selection.isEmpty()) {
        const text = editor.getModel().getValueInRange(selection);
        
        // Get coordinates
        const position = editor.getScrolledVisiblePosition(selection.getEndPosition());
        const domNode = editor.getDomNode();
        if (position && domNode) {
          const rect = domNode.getBoundingClientRect();
          setBubbleMenu({
            show: true,
            x: rect.left + position.left,
            y: rect.top + position.top - 40,
            text
          });
        }
      } else {
        setBubbleMenu(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setLatexCode(value);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  // File Operations
  const handleNewFile = () => setLatexCode('');
  
  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setLatexCode(content);
    };
    reader.readAsText(file);
    // Reset input so the same file can be opened again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveFile = () => {
    const blob = new Blob([latexCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'main.tex';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Edit Operations
  const handleCopy = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('copy');
    }
  };

  const handleCut = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('cut');
    }
  };

  const handlePaste = async () => {
    if (editorRef.current) {
      editorRef.current.focus();
      try {
        const text = await navigator.clipboard.readText();
        insertTextAtCursor(text);
      } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
      }
    }
  };

  // Insert Operations
  const insertTextAtCursor = (textToInsert: string) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      const id = { major: 1, minor: 1 };
      const op = { identifier: id, range: selection, text: textToInsert, forceMoveMarkers: true };
      editor.executeEdits("my-source", [op]);
      editor.focus();
    }
  };

  const handleInsertEquation = () => insertTextAtCursor('\\begin{equation}\n  \n\\end{equation}');
  const handleInsertFigure = () => insertTextAtCursor('\\begin{figure}[h]\n  \\centering\n  \\includegraphics[width=0.5\\textwidth]{image.png}\n  \\caption{Caption here}\n  \\label{fig:label}\n\\end{figure}');
  const handleInsertTable = () => insertTextAtCursor('\\begin{table}[h]\n  \\centering\n  \\begin{tabular}{|c|c|}\n    \\hline\n    Header 1 & Header 2 \\\\\n    \\hline\n    Data 1 & Data 2 \\\\\n    \\hline\n  \\end{tabular}\n  \\caption{Caption here}\n  \\label{tab:label}\n\\end{table}');
  const handleInsertItemize = () => insertTextAtCursor('\\begin{itemize}\n  \\item \n\\end{itemize}');
  const handleInsertEnumerate = () => insertTextAtCursor('\\begin{enumerate}\n  \\item \n\\end{enumerate}');

  // Search Operations
  const handleFindNext = () => {
    if (!searchQuery || !editorRef.current) return;
    const editor = editorRef.current;
    const model = editor.getModel();
    const currentPosition = editor.getPosition();
    
    const match = model.findNextMatch(searchQuery, currentPosition, false, false, null, false);
    if (match) {
      editor.setSelection(match.range);
      editor.revealRangeInCenter(match.range);
      editor.focus();
    }
  };

  const handleReplaceAll = () => {
    if (!searchQuery || !editorRef.current) return;
    const editor = editorRef.current;
    const model = editor.getModel();
    const matches = model.findMatches(searchQuery, false, false, false, null, false);
    
    if (matches.length > 0) {
      const edits = matches.map((match: any) => ({
        range: match.range,
        text: replaceQuery
      }));
      editor.executeEdits("replace-all", edits);
    }
  };

  const handleAiChatSubmit = () => {
    if (aiChatPrompt.trim()) {
      setAiChatHistory(prev => {
        const newHistory = [aiChatPrompt.trim(), ...prev.filter(p => p !== aiChatPrompt.trim())].slice(0, 10);
        return newHistory;
      });
      setAiChatPrompt('');
      setIsAiChatExpanded(false);
      // Here you would trigger the actual AI action
    }
  };

  const editorWorkspace = (
    <TooltipProvider>
      <div className={`flex flex-col h-screen w-full bg-background text-foreground ${isDarkMode ? 'dark' : ''}`}>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".tex,.txt"
          onChange={handleOpenFile}
        />
        <Header 
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          user={user}
          setUser={setUser}
          setCurrentView={handleSetCurrentView}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          editorOpen={editorOpen}
          setEditorOpen={handleSetEditorOpen}
          previewOpen={previewOpen}
          setPreviewOpen={handleSetPreviewOpen}
          wordWrap={wordWrap}
          setWordWrap={setWordWrap}
          handleNewFile={handleNewFile}
          fileInputRef={fileInputRef}
          handleSaveFile={handleSaveFile}
          handleCut={handleCut}
          handleCopy={handleCopy}
          handlePaste={handlePaste}
          handleInsertEquation={handleInsertEquation}
          handleInsertFigure={handleInsertFigure}
          handleInsertTable={handleInsertTable}
          handleInsertItemize={handleInsertItemize}
          handleInsertEnumerate={handleInsertEnumerate}
        />

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden relative">
          <ActivityBar 
            activeSidebarTab={activeSidebarTab}
            setActiveSidebarTab={setActiveSidebarTab}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />

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

          {/* Mobile Overlay */}
          {isMobile && sidebarOpen && (
            <div 
              className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <div className="flex-1 overflow-hidden">
            <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"} className="h-full w-full rounded-none">
              
              {/* Middle: Editor */}
              {editorOpen && (
                <ResizablePanel defaultSize={previewOpen ? 50 : 100} minSize={30}>
                  <EditorPanel 
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    setEditorOpen={handleSetEditorOpen}
                    previewOpen={previewOpen}
                    setPreviewOpen={handleSetPreviewOpen}
                    latexCode={latexCode}
                  setLatexCode={setLatexCode}
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  tabSize={tabSize}
                  setTabSize={setTabSize}
                  wordWrap={wordWrap}
                  setWordWrap={setWordWrap}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  replaceQuery={replaceQuery}
                  setReplaceQuery={setReplaceQuery}
                  handleFindNext={handleFindNext}
                  handleReplaceAll={handleReplaceAll}
                  isDarkMode={isDarkMode}
                  editorRef={editorRef}
                  bubbleMenu={bubbleMenu}
                  setBubbleMenu={setBubbleMenu}
                  isAiChatExpanded={isAiChatExpanded}
                  setIsAiChatExpanded={setIsAiChatExpanded}
                  aiChatPrompt={aiChatPrompt}
                  setAiChatPrompt={setAiChatPrompt}
                  aiChatHistory={aiChatHistory}
                  handleAiChatSubmit={handleAiChatSubmit}
                  handleEditorWillMount={handleEditorWillMount}
                  handleEditorDidMount={handleEditorDidMount}
                  handleEditorChange={handleEditorChange}
                />
              </ResizablePanel>
              )}
              
              {editorOpen && previewOpen && <ResizableHandle withHandle />}
              
              {/* Right: Preview */}
              {previewOpen && (
                <ResizablePanel defaultSize={editorOpen ? (sidebarOpen ? 40 : 50) : 100} minSize={30} className="bg-muted/10">
                  <PreviewPanel 
                    sidebarOpen={sidebarOpen} 
                    setPreviewOpen={handleSetPreviewOpen}
                    editorOpen={editorOpen}
                    setEditorOpen={handleSetEditorOpen}
                  />
                </ResizablePanel>
              )}
              
            </ResizablePanelGroup>
          </div>
        </div>
        
        <StatusBar />
      </div>
    </TooltipProvider>
  );

  const appShellValue = {
    isDarkMode,
    toggleTheme,
    user,
    openProject: (id: string) => navigate(`/project/${id}`),
    logout: () => {
      setUser(null);
      navigate('/login');
    },
  };

  return (
    <AppShellProvider value={appShellValue}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/login"
          element={
            <div className={isDarkMode ? 'dark' : ''}>
              <Login
                onLogin={(userData) => {
                  setUser(userData);
                  navigate('/dashboard');
                }}
                onNavigateToSignup={() => navigate('/signup')}
              />
            </div>
          }
        />
        <Route
          path="/signup"
          element={
            <div className={isDarkMode ? 'dark' : ''}>
              <Signup
                onSignup={(userData) => {
                  setUser(userData);
                  navigate('/dashboard');
                }}
                onNavigateToLogin={() => navigate('/login')}
              />
            </div>
          }
        />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/project/:id" element={editorWorkspace} />
        <Route path="/editor" element={<Navigate to="/project/new" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShellProvider>
  );
}
