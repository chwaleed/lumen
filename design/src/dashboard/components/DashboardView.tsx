import React, { useMemo, useState } from 'react';
import { ProjectCard } from '@/src/projects/components/ProjectCard';
import { TemplateCard } from '@/src/projects/components/TemplateCard';
import { LibraryPageLayout } from '@/src/projects/components/LibraryPageLayout';
import { projectsData, templatesData } from '@/src/projects/data/libraryData';
import { useAppShell } from '@/src/shared/AppShellContext';

export function DashboardView() {
  const { isDarkMode, toggleTheme, user, openProject, logout } = useAppShell();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = useMemo(
    () => projectsData.filter((project) => project.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery]
  );
  const filteredTemplates = useMemo(
    () =>
      templatesData.filter(
        (template) =>
          template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [searchQuery]
  );

  return (
    <LibraryPageLayout
      activeTab="recent"
      isDarkMode={isDarkMode}
      onOpenProject={openProject}
      toggleTheme={toggleTheme}
      user={user}
      onLogout={logout}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    >
      <section>
        <h2 className="text-lg font-medium mb-4">Start something new</h2>
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No templates found matching "{searchQuery}"</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.slice(0, 3).map((template) => (
              <TemplateCard key={template.id} template={template} onOpenProject={openProject} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium mb-4">Recent Documents</h2>
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No documents found matching "{searchQuery}"</div>
        ) : (
          <div className="space-y-2">
            {filteredProjects.slice(0, 3).map((project) => (
              <ProjectCard key={project.id} project={project} onOpenProject={openProject} />
            ))}
          </div>
        )}
      </section>
    </LibraryPageLayout>
  );
}
