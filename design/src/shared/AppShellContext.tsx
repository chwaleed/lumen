import React, { createContext, useContext } from 'react';

type User = { name: string; email: string; avatar: string } | null;

interface AppShellContextValue {
  isDarkMode: boolean;
  toggleTheme: () => void;
  user: User;
  openProject: (projectId: string) => void;
  logout: () => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({
  value,
  children,
}: {
  value: AppShellContextValue;
  children: React.ReactNode;
}) {
  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>;
}

export function useAppShell() {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error('useAppShell must be used within AppShellProvider');
  }
  return context;
}
