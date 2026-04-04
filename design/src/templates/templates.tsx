import React from 'react';
import { useAppShell } from '@/src/shared/AppShellContext';
import { TemplatesView } from './components/TemplatesView';

export default function TemplatesPage() {
  const { isDarkMode } = useAppShell();

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <TemplatesView />
    </div>
  );
}