import React from 'react';
import { useAppShell } from '@/src/shared/AppShellContext';
import { ProjectsView } from './components/ProjectsView';

export default function ProjectsPage() {
  const { isDarkMode } = useAppShell();

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <ProjectsView />
    </div>
  );
}