import React from 'react';
import { useAppShell } from '@/src/shared/AppShellContext';
import { DashboardView } from './components/DashboardView';

export default function DashboardPage() {
  const { isDarkMode } = useAppShell();

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <DashboardView />
    </div>
  );
}