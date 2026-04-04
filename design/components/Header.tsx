import React from 'react';
import { 
  Sparkles, 
  Download, 
  Play, 
  Moon, 
  Sun, 
  LogOut, 
  User, 
  Settings, 
  Plus,
  Columns,
  Code,
  FileText,
  PanelLeft,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  user: { name: string, email: string, avatar: string } | null;
  setUser: (user: any) => void;
  setCurrentView: (view: 'editor' | 'login' | 'signup' | 'projects') => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  editorOpen: boolean;
  setEditorOpen: (open: boolean) => void;
  previewOpen: boolean;
  setPreviewOpen: (open: boolean) => void;
  wordWrap: boolean;
  setWordWrap: (wrap: boolean) => void;
  handleNewFile: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleSaveFile: () => void;
  handleCut: () => void;
  handleCopy: () => void;
  handlePaste: () => void;
  handleInsertEquation: () => void;
  handleInsertFigure: () => void;
  handleInsertTable: () => void;
  handleInsertItemize: () => void;
  handleInsertEnumerate: () => void;
}

export function Header({
  isDarkMode,
  toggleTheme,
  user,
  setUser,
  setCurrentView,
  sidebarOpen,
  setSidebarOpen,
  editorOpen,
  setEditorOpen,
  previewOpen,
  setPreviewOpen,
  wordWrap,
  setWordWrap,
  handleNewFile,
  fileInputRef,
  handleSaveFile,
  handleCut,
  handleCopy,
  handlePaste,
  handleInsertEquation,
  handleInsertFigure,
  handleInsertTable,
  handleInsertItemize,
  handleInsertEnumerate
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-2 border-b bg-card">
      <div className="flex items-center space-x-4">
        <div 
          className="flex items-center space-x-2 text-primary cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setCurrentView('projects')}
        >
          <Sparkles className="h-6 w-6" />
          <span className="font-bold text-lg tracking-tight">TexAI</span>
        </div>
        <Separator orientation="vertical" className="h-6" />
        
        {/* Mobile Menu */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
              <Menu className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleNewFile}>New File</DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>Open File...</DropdownMenuItem>
              <DropdownMenuItem onClick={handleSaveFile}>Save</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Compile Document</DropdownMenuItem>
              <DropdownMenuItem>Export PDF</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleTheme}>Toggle Theme</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setWordWrap(!wordWrap)}>
                {wordWrap ? 'Disable Word Wrap' : 'Enable Word Wrap'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="hidden md:flex items-center space-x-1">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
              File
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleNewFile}>New File<DropdownMenuShortcut>Ctrl+N</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>Open File...<DropdownMenuShortcut>Ctrl+O</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSaveFile}>Save<DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem onClick={handleSaveFile}>Save As...<DropdownMenuShortcut>Ctrl+Shift+S</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Export PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
              Edit
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>Undo<DropdownMenuShortcut>Ctrl+Z</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem>Redo<DropdownMenuShortcut>Ctrl+Y</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCut}>Cut<DropdownMenuShortcut>Ctrl+X</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopy}>Copy<DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem onClick={handlePaste}>Paste<DropdownMenuShortcut>Ctrl+V</DropdownMenuShortcut></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
              View
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={toggleTheme}>
                Toggle Theme
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setWordWrap(!wordWrap)}>
                {wordWrap ? 'Disable Word Wrap' : 'Enable Word Wrap'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
              Insert
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleInsertEquation}>Equation</DropdownMenuItem>
              <DropdownMenuItem onClick={handleInsertFigure}>Figure</DropdownMenuItem>
              <DropdownMenuItem onClick={handleInsertTable}>Table</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleInsertItemize}>Itemize</DropdownMenuItem>
              <DropdownMenuItem onClick={handleInsertEnumerate}>Enumerate</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
      <div className="flex items-center space-x-2">
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" size="sm" className="hidden sm:flex" />}>
            <Play className="h-4 w-4 mr-2" />
            Compile
          </TooltipTrigger>
          <TooltipContent>Compile Document (Ctrl+Enter)</TooltipContent>
        </Tooltip>
        <Button variant="default" size="sm" className="hidden sm:flex">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <Columns className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-2">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Code className="h-4 w-4" />
                  <span>Code</span>
                </div>
                <Switch 
                  checked={editorOpen} 
                  onCheckedChange={setEditorOpen} 
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>PDF</span>
                </div>
                <Switch 
                  checked={previewOpen} 
                  onCheckedChange={setPreviewOpen} 
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <PanelLeft className="h-4 w-4" />
                  <span>Sidebar</span>
                </div>
                <Switch 
                  checked={sidebarOpen} 
                  onCheckedChange={setSidebarOpen} 
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <DropdownMenu>
          <DropdownMenuTrigger render={<button className="outline-none rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />}>
            <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
              <AvatarImage src={user?.avatar || "https://github.com/shadcn.png"} />
              <AvatarFallback>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {user ? (
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setUser(null)}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            ) : (
              <DropdownMenuGroup>
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCurrentView('login')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Log in</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentView('signup')}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Sign up</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
