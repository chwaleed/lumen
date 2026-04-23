import React from 'react';
import {
  Clock,
  FolderOpen,
  LayoutTemplate,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export type DashboardTab = 'recent' | 'all' | 'templates';

interface DashboardSidebarProps {
  isMobile: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onOpenProject: (projectId: string) => void;
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  onLogout?: () => void;
}

 function Sidebar({
  isMobile,
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  onSelectTab,
  onOpenProject,
  user,
}: DashboardSidebarProps) {
  return (
    <div
      className={`${isMobile ? 'absolute z-30 shadow-xl' : 'relative'} ${
        isMobile && !sidebarOpen ? 'hidden' : 'flex'
      } w-75 border-r bg-background flex-col h-full transition-all`}
    >
      <div className="h-20 px-6 flex items-center gap-2.5 text-foreground border-b">
        <Sparkles className="h-5 w-5" />
        <span className="font-semibold text-[34px] leading-none tracking-tight">TexAI</span>
        {isMobile && (
          <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="px-4 pt-3 pb-4">
        <Button className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90" size="lg" onClick={() => onOpenProject('new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        <Button
          variant={activeTab === 'recent' ? 'secondary' : 'ghost'}
          className="h-11 w-full justify-start text-[18px]"
          onClick={() => onSelectTab('recent')}
        >
          <Clock className="mr-3 h-4 w-4" />
          Recent
        </Button>
        <Button
          variant={activeTab === 'all' ? 'secondary' : 'ghost'}
          className="h-11 w-full justify-start text-[18px]"
          onClick={() => onSelectTab('all')}
        >
          <FolderOpen className="mr-3 h-4 w-4" />
          All Projects
        </Button>
        <Button
          variant={activeTab === 'templates' ? 'secondary' : 'ghost'}
          className="h-11 w-full justify-start text-[18px]"
          onClick={() => onSelectTab('templates')}
        >
          <LayoutTemplate className="mr-3 h-4 w-4" />
          Templates
        </Button>
      </nav>

      <div className="border-t px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-base font-medium">{user?.name || 'User'}</p>
            <p className="truncate text-sm text-muted-foreground">{user?.email || 'user@example.com'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
