import type { LucideIcon } from "lucide-react";
import {
  BookOpenText,
  FileStack,
  FlaskConical,
  FolderTree,
  Gauge,
  GraduationCap,
  Keyboard,
  MonitorSmartphone,
  RefreshCcw,
  Sparkles,
  WandSparkles,
  Wrench,
} from "lucide-react";
import type { HomeAiAction, HomeTemplateKey } from "@/app/(marketing)/use-home-hook";

export type LandingNavItem = {
  href: string;
  label: string;
};

export type TemplateCard = {
  key: HomeTemplateKey;
  title: string;
  subtitle: string;
  icon: LucideIcon;
};

export type FeatureCard = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type WorkflowStep = {
  number: string;
  title: string;
  description: string;
  preview: string[];
};

export type AudienceCard = {
  title: string;
  description: string;
  tags: string[];
  icon: LucideIcon;
};

export const navigationItems: LandingNavItem[] = [
  { href: "#features", label: "Features" },
  { href: "#workflow", label: "How it works" },
  { href: "#audience", label: "Built for" },
];

export const heroMetrics = [
  { value: "2x", label: "Faster drafting" },
  { value: "<200ms", label: "Preview latency" },
  { value: "Unlimited", label: "Snapshot history" },
  { value: "12k+", label: "Documents created" },
];

export const templateCards: TemplateCard[] = [
  {
    key: "article",
    title: "Research article",
    subtitle: "Journal-friendly structure with references ready.",
    icon: FileStack,
  },
  {
    key: "beamer",
    title: "Beamer deck",
    subtitle: "Slides with live frame preview and export.",
    icon: WandSparkles,
  },
  {
    key: "thesis",
    title: "Thesis workspace",
    subtitle: "Multi-file chapters, figures, and bibliography.",
    icon: BookOpenText,
  },
];

export const documentCards = [
  { title: "Paper draft", updatedAt: "Edited 6 min ago" },
  { title: "Presentation", updatedAt: "Edited yesterday" },
  { title: "Blank document", updatedAt: "Created 2 days ago" },
];

export const features: FeatureCard[] = [
  {
    title: "Distraction-free editing",
    description:
      "A focused LaTeX editor with syntax highlighting, command support, and the kind of spacing that keeps long writing sessions calm.",
    icon: Keyboard,
  },
  {
    title: "Real-time preview",
    description:
      "Compile feedback appears alongside your source so layout, equations, and sections stay visible while you write.",
    icon: Gauge,
  },
  {
    title: "Project file tree",
    description:
      "Keep chapters, appendices, figures, and bibliography files organized in a workspace that feels like a real project, not a single textarea.",
    icon: FolderTree,
  },
  {
    title: "Snapshot versioning",
    description:
      "Save milestones before a big rewrite, jump back when feedback goes sideways, and keep momentum without a Git lesson in the middle of writing.",
    icon: RefreshCcw,
  },
  {
    title: "Inline AI assistant",
    description:
      "Select a line, ask for a rewrite or explanation, and keep working without bouncing between tabs or reformatting pasted output.",
    icon: Sparkles,
  },
  {
    title: "Desktop to tablet",
    description:
      "A large-screen writing environment that still collapses gracefully on smaller devices when you just need to review or tweak a section.",
    icon: MonitorSmartphone,
  },
];

export const workflowSteps: WorkflowStep[] = [
  {
    number: "01",
    title: "Open or import your project",
    description:
      "Start with a blank template or bring in an existing `.tex` project. The editor preserves structure so chapters and figures stay where they belong.",
    preview: ["phd-thesis/", "chapters/", "figures/", "main.tex", "refs.bib"],
  },
  {
    number: "02",
    title: "Write with live feedback",
    description:
      "Draft in LaTeX while the preview stays in lockstep. When a sentence is awkward, select it and let the assistant improve it inline.",
    preview: ["\\section{Methods}", "[Selected text]", "Improve • Rewrite • Explain"],
  },
  {
    number: "03",
    title: "Snapshot, export, submit",
    description:
      "Save named checkpoints and export a polished PDF from the same workspace. No local TeX install, no last-minute tooling detour.",
    preview: ["Snapshot saved", "pre-review-v2 • 2 min ago", "Export PDF thesis-final.pdf"],
  },
];

export const audienceCards: AudienceCard[] = [
  {
    title: "Graduate students and PhD researchers",
    description:
      "Large thesis projects stay organized, versioned, and easier to revisit when your document grows beyond a handful of files.",
    tags: ["Thesis writing", "Chapter management", "Snapshot history", "AI proofreading"],
    icon: GraduationCap,
  },
  {
    title: "Academic researchers and faculty",
    description:
      "Ship journal papers and conference revisions with a workspace built for repeat editing, references, and structured sections.",
    tags: ["Journal articles", "Conference papers", "Revision cycles", "Math typesetting"],
    icon: FlaskConical,
  },
  {
    title: "Engineers and technical writers",
    description:
      "Produce equations, specs, and technical documentation without juggling build steps and formatting tools at the same time.",
    tags: ["Technical docs", "Specifications", "Figures", "PDF export"],
    icon: Wrench,
  },
  {
    title: "Students learning LaTeX",
    description:
      "Get unstuck faster with templates, inline explanations, and a UI that makes the document structure visible while you learn.",
    tags: ["First papers", "Assignments", "Error explanation", "Templates"],
    icon: BookOpenText,
  },
];

export const aiActionText: Record<HomeAiAction, string> = {
  Improve: "Tighten phrasing for a cleaner slide introduction.",
  Rewrite: "Rewrite the selected line with a more formal research tone.",
  Explain: "Explain what this frame command is doing in plain language.",
};
