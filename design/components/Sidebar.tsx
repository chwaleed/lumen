import React, { useState } from 'react';
import { 
  FileText, 
  Folder, 
  Search,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  Sparkles,
  MoreVertical,
  FilePlus,
  FolderPlus,
  Edit2,
  Copy,
  Trash2,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  activeSidebarTab: string;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  replaceQuery: string;
  setReplaceQuery: (query: string) => void;
  handleFindNext: () => void;
  handleReplaceAll: () => void;
}

type FileNode = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  isOpen?: boolean;
};

const initialFiles: FileNode[] = [
  { id: '1', name: 'main.tex', type: 'file' },
  { id: '2', name: 'references.bib', type: 'file' },
  { 
    id: '3', 
    name: 'images', 
    type: 'folder', 
    isOpen: true, 
    children: [
      { id: '4', name: 'figure1.png', type: 'file' }
    ] 
  }
];

export function Sidebar({
  activeSidebarTab,
  sidebarOpen,
  setSidebarOpen,
  searchQuery,
  setSearchQuery,
  replaceQuery,
  setReplaceQuery,
  handleFindNext,
  handleReplaceAll
}: SidebarProps) {
  const [files, setFiles] = useState<FileNode[]>(initialFiles);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [projectName, setProjectName] = useState('EXPLORER');
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editProjectNameValue, setEditProjectNameValue] = useState('');

  if (!sidebarOpen) return null;

  const updateNode = (nodes: FileNode[], id: string, updater: (node: FileNode) => FileNode): FileNode[] => {
    return nodes.map(node => {
      if (node.id === id) return updater(node);
      if (node.children) return { ...node, children: updateNode(node.children, id, updater) };
      return node;
    });
  };

  const deleteNode = (nodes: FileNode[], id: string): FileNode[] => {
    return nodes.filter(node => node.id !== id).map(node => {
      if (node.children) return { ...node, children: deleteNode(node.children, id) };
      return node;
    });
  };

  const addNode = (nodes: FileNode[], parentId: string, newNode: FileNode): FileNode[] => {
    if (parentId === 'root') {
      return [...nodes, newNode];
    }
    return nodes.map(node => {
      if (node.id === parentId && node.type === 'folder') {
        return { ...node, children: [...(node.children || []), newNode], isOpen: true };
      }
      if (node.children) return { ...node, children: addNode(node.children, parentId, newNode) };
      return node;
    });
  };

  const duplicateNode = (nodes: FileNode[], id: string): FileNode[] => {
    let newNodes = [...nodes];
    const index = newNodes.findIndex(n => n.id === id);
    if (index !== -1) {
      const duplicate = JSON.parse(JSON.stringify(newNodes[index]));
      const assignNewIds = (n: FileNode) => {
        n.id = Math.random().toString(36).substr(2, 9);
        if (n.children) n.children.forEach(assignNewIds);
      };
      assignNewIds(duplicate);
      duplicate.name = `${duplicate.name} (copy)`;
      newNodes.splice(index + 1, 0, duplicate);
      return newNodes;
    }
    return newNodes.map(node => {
      if (node.children) return { ...node, children: duplicateNode(node.children, id) };
      return node;
    });
  };

  const handleToggleFolder = (id: string) => {
    setFiles(updateNode(files, id, node => ({ ...node, isOpen: !node.isOpen })));
  };

  const handleAddFile = (parentId: string) => {
    const newNode: FileNode = { id: Math.random().toString(36).substr(2, 9), name: 'new_file.tex', type: 'file' };
    setFiles(addNode(files, parentId, newNode));
    setEditingNodeId(newNode.id);
    setEditName(newNode.name);
  };

  const handleAddFolder = (parentId: string) => {
    const newNode: FileNode = { id: Math.random().toString(36).substr(2, 9), name: 'New Folder', type: 'folder', isOpen: true, children: [] };
    setFiles(addNode(files, parentId, newNode));
    setEditingNodeId(newNode.id);
    setEditName(newNode.name);
  };

  const handleRename = (id: string, currentName: string) => {
    setEditingNodeId(id);
    setEditName(currentName);
  };

  const submitRename = (id: string) => {
    if (editName.trim()) {
      setFiles(updateNode(files, id, node => ({ ...node, name: editName.trim() })));
    }
    setEditingNodeId(null);
  };

  const getFileIcon = (name: string) => {
    if (name.endsWith('.tex')) return <FileText className="h-4 w-4 mr-2 text-blue-500" />;
    if (name.endsWith('.bib')) return <FileText className="h-4 w-4 mr-2 text-orange-400" />;
    if (name.endsWith('.png') || name.endsWith('.jpg')) return <ImageIcon className="h-4 w-4 mr-2 text-purple-400" />;
    return <FileText className="h-4 w-4 mr-2 text-muted-foreground" />;
  };

  const renderTree = (nodes: FileNode[], level: number = 0) => {
    return nodes.map(node => {
      const paddingLeft = level * 12 + 8;

      return (
        <div key={node.id}>
          <div 
            className={`flex items-center justify-between py-1.5 text-sm rounded-md hover:bg-muted group ${editingNodeId === node.id ? 'bg-muted' : ''}`}
            style={{ paddingLeft: `${paddingLeft}px`, paddingRight: '8px' }}
          >
            <div 
              className="flex items-center flex-1 overflow-hidden cursor-pointer"
              onClick={() => node.type === 'folder' ? handleToggleFolder(node.id) : null}
            >
              {node.type === 'folder' ? (
                <>
                  <div className="w-4 h-4 mr-1 flex items-center justify-center">
                    {node.isOpen ? <ChevronDown className="h-3 w-3 opacity-50" /> : <ChevronRight className="h-3 w-3 opacity-50" />}
                  </div>
                  <Folder className="h-4 w-4 mr-2 text-yellow-500" />
                </>
              ) : (
                <>
                  <div className="w-4 h-4 mr-1"></div>
                  {getFileIcon(node.name)}
                </>
              )}
              
              {editingNodeId === node.id ? (
                <Input 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => submitRename(node.id)}
                  onKeyDown={(e) => e.key === 'Enter' && submitRename(node.id)}
                  className="h-6 text-xs px-1 py-0 w-full bg-background"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate">{node.name}</span>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {node.type === 'folder' && (
                  <>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAddFile(node.id); }}>
                      <FilePlus className="mr-2 h-4 w-4" /> New File
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAddFolder(node.id); }}>
                      <FolderPlus className="mr-2 h-4 w-4" /> New Folder
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRename(node.id, node.name); }}>
                    <Edit2 className="mr-2 h-4 w-4" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setFiles(duplicateNode(files, node.id)); }}>
                    <Copy className="mr-2 h-4 w-4" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setFiles(deleteNode(files, node.id)); }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {node.type === 'folder' && node.isOpen && node.children && (
            <div>{renderTree(node.children, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className={`absolute left-0 z-20 md:relative md:left-0 w-full sm:w-72 flex-shrink-0 border-r bg-background md:bg-muted/10 flex-col h-full shadow-xl md:shadow-none ${!sidebarOpen ? 'hidden' : 'flex'}`}>
      {activeSidebarTab === 'files' && (
        <div className="flex flex-col h-full">
          <div className="px-4 py-2 border-b bg-muted/20 flex items-center justify-between">
            {isEditingProjectName ? (
              <Input
                value={editProjectNameValue}
                onChange={(e) => setEditProjectNameValue(e.target.value)}
                onBlur={() => {
                  if (editProjectNameValue.trim()) setProjectName(editProjectNameValue.trim().toUpperCase());
                  setIsEditingProjectName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (editProjectNameValue.trim()) setProjectName(editProjectNameValue.trim().toUpperCase());
                    setIsEditingProjectName(false);
                  } else if (e.key === 'Escape') {
                    setIsEditingProjectName(false);
                  }
                }}
                className="h-6 text-xs px-1 py-0 w-32 bg-background font-semibold uppercase tracking-wider"
                autoFocus
              />
            ) : (
              <h2 
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors truncate mr-2"
                onClick={() => {
                  setEditProjectNameValue(projectName);
                  setIsEditingProjectName(true);
                }}
                title="Click to rename project"
              >
                {projectName}
              </h2>
            )}
            <div className="flex items-center">
              <Tooltip>
                <TooltipTrigger render={
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleAddFile('root')}>
                    <FilePlus className="h-4 w-4" />
                  </Button>
                } />
                <TooltipContent>New File</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger render={
                  <Button variant="ghost" size="icon" className="h-6 w-6 mr-1" onClick={() => handleAddFolder('root')}>
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                } />
                <TooltipContent>New Folder</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger render={
                  <Button variant="ghost" size="icon" className="h-6 w-6 hidden md:flex" onClick={() => setSidebarOpen(false)}>
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                } />
                <TooltipContent>Close Sidebar</TooltipContent>
              </Tooltip>
              <Button variant="ghost" size="icon" className="h-6 w-6 md:hidden ml-1" onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {renderTree(files)}
            </div>
          </ScrollArea>
        </div>
      )}

      {activeSidebarTab === 'search' && (
        <div className="flex flex-col h-full">
          <div className="px-4 py-2 border-b bg-muted/20 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search</h2>
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="h-6 w-6 hidden md:flex" onClick={() => setSidebarOpen(false)}>
                <PanelLeftClose className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 md:hidden ml-1" onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <Input 
              placeholder="Search" 
              className="h-8 text-sm" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Input 
              placeholder="Replace" 
              className="h-8 text-sm" 
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
            />
            <Button variant="secondary" className="w-full h-8 text-sm" onClick={handleFindNext}>Find Next</Button>
            <Button variant="secondary" className="w-full h-8 text-sm" onClick={handleReplaceAll}>Replace All</Button>
          </div>
        </div>
      )}

      {activeSidebarTab === 'ai' && (
        <div className="flex flex-col h-full">
          <div className="px-4 py-2 border-b bg-muted/20 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Assistant</h2>
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="h-6 w-6 hidden md:flex" onClick={() => setSidebarOpen(false)}>
                <PanelLeftClose className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 md:hidden ml-1" onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">TexAI</span>
                </div>
                <div className="bg-muted p-3 rounded-lg text-sm rounded-tl-none">
                  Hello! I can help you write LaTeX, fix errors, or format equations. What do you need help with?
                </div>
              </div>
              
              <div className="flex flex-col space-y-2 items-end">
                <div className="bg-primary text-primary-foreground p-3 rounded-lg text-sm rounded-tr-none">
                  Can you create a complex table for my data?
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">TexAI</span>
                </div>
                <div className="bg-muted p-3 rounded-lg text-sm rounded-tl-none space-y-2">
                  <p>Sure! Here's a template for a professional-looking table using the <code>booktabs</code> package:</p>
                  <div className="bg-background p-2 rounded border font-mono text-xs overflow-x-auto">
                    \begin{'{table}'}[htbp]<br/>
                    \centering<br/>
                    \begin{'{tabular}'}{'{llr}'}<br/>
                    \toprule<br/>
                    Item & Description & Cost \\<br/>
                    \midrule<br/>
                    1 & Apple & $1.00 \\<br/>
                    2 & Banana & $0.50 \\<br/>
                    \bottomrule<br/>
                    \end{'{tabular}'}<br/>
                    \caption{'{Sample Table}'}<br/>
                    \end{'{table}'}
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    Insert at Cursor
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
          <div className="p-3 border-t bg-background">
            <div className="relative">
              <Textarea 
                placeholder="Ask AI to write or fix LaTeX..." 
                className="min-h-[80px] resize-none pr-10 text-sm"
              />
              <Button size="icon" className="absolute bottom-2 right-2 h-8 w-8 rounded-full">
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
