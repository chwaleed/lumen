import React from 'react';
import {
  Clock,
  FolderOpen,
  LayoutTemplate,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export type DashboardTab = 'recent' | 'all' | 'templates';

interface DashboardSidebarProps {
  isMobile: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onOpenProject: (projectId: string) => void;
  user?: any;
  onLogout?: () => void;
}

export function DashboardSidebar({
  isMobile,
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  onSelectTab,
  onOpenProject,
  user,
  onLogout,
}: DashboardSidebarProps) {
  return (
    <div
      className={`${isMobile ? 'absolute z-30 shadow-xl' : 'relative'} ${
        isMobile && !sidebarOpen ? 'hidden' : 'flex'
      } w-64 border-r bg-card/30 flex-col h-full transition-all`}
    >
      <div className="p-6 flex items-center space-x-2 text-primary">
        <Sparkles className="h-6 w-6" />
        <span className="font-bold text-xl tracking-tight">TexAI</span>
        {isMobile && (
          <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="px-4 pb-4">
        <Button className="w-full justify-start shadow-sm" size="lg" onClick={() => onOpenProject('new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <nav className="flex-1 px-2 space-y-1">
        <Button
          variant={activeTab === 'recent' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onSelectTab('recent')}
        >
          <Clock className="mr-3 h-4 w-4" />
          Recent
        </Button>
        <Button
          variant={activeTab === 'all' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onSelectTab('all')}
        >
          <FolderOpen className="mr-3 h-4 w-4" />
          All Projects
        </Button>
        <Button
          variant={activeTab === 'templates' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => onSelectTab('templates')}
        >
          <LayoutTemplate className="mr-3 h-4 w-4" />
          Templates
        </Button>
      </nav>

      <div className="p-4 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start px-2 h-12">
              <Avatar className="h-7 w-7 mr-3">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start overflow-hidden">
                <span className="truncate text-sm font-medium">{user?.name || 'User'}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.email || 'user@example.com'}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
