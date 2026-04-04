import React from 'react';
import { Sidebar } from '@/components/Sidebar';

type EditorSidebarProps = React.ComponentProps<typeof Sidebar>;

export function EditorSidebar(props: EditorSidebarProps) {
  return <Sidebar {...props} />;
}
