import React, { useMemo, useState } from 'react';
import { ProjectCard } from '@/src/projects/components/ProjectCard';
import { LibraryPageLayout } from '@/src/projects/components/LibraryPageLayout';
import { projectsData } from '@/src/projects/data/libraryData';
import { useAppShell } from '@/src/shared/AppShellContext';

export function ProjectsView() {
  const { isDarkMode, toggleTheme, user, openProject, logout } = useAppShell();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = useMemo(
    () => projectsData.filter((project) => project.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery]
  );

  return (
    <LibraryPageLayout
      activeTab="all"
      isDarkMode={isDarkMode}
      onOpenProject={openProject}
      toggleTheme={toggleTheme}
      user={user}
      onLogout={logout}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    >
      <section>
        <h2 className="text-lg font-medium mb-4">All Projects</h2>
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No projects found matching "{searchQuery}"</div>
        ) : (
          <div className="space-y-2">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} onOpenProject={openProject} />
            ))}
          </div>
        )}
      </section>
    </LibraryPageLayout>
  );
}
