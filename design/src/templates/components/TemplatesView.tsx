import React, { useMemo, useState } from 'react';
import { LibraryPageLayout } from '@/src/projects/components/LibraryPageLayout';
import { TemplateCard } from '@/src/projects/components/TemplateCard';
import { templatesData } from '@/src/projects/data/libraryData';
import { useAppShell } from '@/src/shared/AppShellContext';

export function TemplatesView() {
  const { isDarkMode, toggleTheme, user, openProject, logout } = useAppShell();
  const [searchQuery, setSearchQuery] = useState('');

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
      activeTab="templates"
      isDarkMode={isDarkMode}
      onOpenProject={openProject}
      toggleTheme={toggleTheme}
      user={user}
      onLogout={logout}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    >
      <section>
        <h2 className="text-lg font-medium mb-4">Template Gallery</h2>
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No templates found matching "{searchQuery}"</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} onOpenProject={openProject} />
            ))}
          </div>
        )}
      </section>
    </LibraryPageLayout>
  );
}
