import { BookOpen, FilePlus, FileText, LayoutTemplate, Sigma } from 'lucide-react';

export interface ProjectItem {
  id: string;
  name: string;
  updatedAt: string;
  type: string;
  tags: string[];
}

export interface TemplateItem {
  id: string;
  name: string;
  icon: any;
  color: string;
  bg: string;
  description: string;
  price?: number;
  author?: string;
  isCustom?: boolean;
}

export const projectsData: ProjectItem[] = [
  { id: '1', name: 'Quantum Mechanics Assignment', updatedAt: '2 hours ago', type: 'article', tags: ['Physics', 'Homework'] },
  { id: '2', name: 'Master Thesis Draft', updatedAt: 'Yesterday', type: 'report', tags: ['Thesis', 'Draft'] },
  { id: '3', name: 'Machine Learning Notes', updatedAt: 'Last week', type: 'notes', tags: ['CS', 'Notes'] },
  { id: '4', name: 'Resume 2026', updatedAt: '2 weeks ago', type: 'cv', tags: ['Personal', 'Career'] },
  { id: '5', name: 'Math 101 Midterm', updatedAt: '1 month ago', type: 'article', tags: ['Math', 'Exam'] },
];

export const templatesData: TemplateItem[] = [
  { id: 'blank', name: 'Blank Document', icon: FilePlus, color: 'text-blue-500', bg: 'bg-blue-500/10', description: 'Start from scratch', price: 0 },
  { id: 'academic', name: 'Academic Paper', icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-500/10', description: 'Standard IEEE/ACM format', price: 0 },
  { id: 'math', name: 'Math Assignment', icon: Sigma, color: 'text-emerald-500', bg: 'bg-emerald-500/10', description: 'Pre-configured for equations', price: 0 },
  { id: 'presentation', name: 'Beamer Presentation', icon: LayoutTemplate, color: 'text-orange-500', bg: 'bg-orange-500/10', description: 'Slide deck for presentations', price: 0 },
  { id: 'resume', name: 'CV / Resume', icon: FileText, color: 'text-rose-500', bg: 'bg-rose-500/10', description: 'Professional resume template', price: 0 },
  { id: 'letter', name: 'Formal Letter', icon: FileText, color: 'text-cyan-500', bg: 'bg-cyan-500/10', description: 'Standard letter format', price: 0 },
];
