import { BookOpen, FilePlus, FileText, LayoutTemplate, Sigma } from "lucide-react";
import type { ComponentType } from "react";

export interface ProjectItem {
  id: string;
  name: string;
  updatedAt: string;
  tags: string[];
}

export type TemplateTone =
  | "primary"
  | "secondary"
  | "accent"
  | "muted"
  | "chart-1"
  | "chart-2";

export interface TemplateItem {
  id: string;
  name: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone: TemplateTone;
  price?: number;
  author?: string;
  isCustom?: boolean;
}

export const projectsData: ProjectItem[] = [
  { id: "1", name: "Quantum Mechanics Assignment", updatedAt: "2 hours ago", tags: ["Physics", "Homework"] },
  { id: "2", name: "Master Thesis Draft", updatedAt: "Yesterday", tags: ["Thesis", "Draft"] },
  { id: "3", name: "Machine Learning Notes", updatedAt: "Last week", tags: ["CS", "Notes"] },
  { id: "4", name: "Resume 2026", updatedAt: "2 weeks ago", tags: ["Personal", "Career"] },
  { id: "5", name: "Math 101 Midterm", updatedAt: "1 month ago", tags: ["Math", "Exam"] },
];

export const templatesData: TemplateItem[] = [
  {
    id: "blank",
    name: "Blank Document",
    icon: FilePlus,
    tone: "primary",
    description: "Start from scratch",
    price: 0,
  },
  {
    id: "academic",
    name: "Academic Paper",
    icon: BookOpen,
    tone: "secondary",
    description: "Standard IEEE/ACM format",
    price: 0,
  },
  {
    id: "math",
    name: "Math Assignment",
    icon: Sigma,
    tone: "accent",
    description: "Pre-configured for equations",
    price: 0,
  },
  {
    id: "presentation",
    name: "Beamer Presentation",
    icon: LayoutTemplate,
    tone: "chart-1",
    description: "Slide deck for presentations",
    price: 0,
  },
  {
    id: "resume",
    name: "CV / Resume",
    icon: FileText,
    tone: "chart-2",
    description: "Professional resume template",
    price: 0,
  },
  {
    id: "letter",
    name: "Formal Letter",
    icon: FileText,
    tone: "muted",
    description: "Standard letter format",
    price: 0,
  },
];
