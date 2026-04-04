import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectsHeader } from '@/components/ProjectsHeader';
import { DashboardSidebar, type DashboardTab } from '@/src/dashboard/components/DashboardSidebar';
import { useMediaQuery } from '@/src/hooks/use-media-query';

interface LibraryPageLayoutProps {
  activeTab: DashboardTab;
  isDarkMode: boolean;
  user?: any;
  onLogout?: () => void;
  toggleTheme?: () => void;
  onOpenProject: (projectId: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  children: React.ReactNode;
}

export function LibraryPageLayout({
  activeTab,
  isDarkMode,
  user,
  onLogout,
  toggleTheme,
  onOpenProject,
  searchQuery,
  setSearchQuery,
  children,
}: LibraryPageLayoutProps) {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavClick = (tab: DashboardTab) => {
    if (tab === 'recent') navigate('/dashboard');
    if (tab === 'all') navigate('/projects');
    if (tab === 'templates') navigate('/templates');
    if (isMobile) setSidebarOpen(false);
  };

  return (
    <div className={`flex h-screen bg-background text-foreground relative ${isDarkMode ? 'dark' : ''}`}>
      {isMobile && sidebarOpen && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20" onClick={() => setSidebarOpen(false)} />
      )}

      <DashboardSidebar
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeTab={activeTab}
        onSelectTab={handleNavClick}
        onOpenProject={onOpenProject}
        user={user}
        onLogout={onLogout}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectsHeader
          isMobile={isMobile}
          isDarkMode={isDarkMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setSidebarOpen={setSidebarOpen}
          toggleTheme={toggleTheme}
        />

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto space-y-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
