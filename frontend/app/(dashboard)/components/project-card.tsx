import { Clock3, FileText } from "lucide-react";
import type { ProjectItem } from "@/app/(dashboard)/data/library-data";

type ProjectCardProps = {
  project: ProjectItem;
  onOpenProject: (projectId: string) => void;
};

export function ProjectCard({ project, onOpenProject }: ProjectCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpenProject(project.id)}
      className="group flex w-full items-center justify-between rounded-xl border border-transparent bg-transparent p-4 text-left transition hover:border-border/60 hover:bg-muted/20"
    >
      <div className="flex items-center gap-4">
        <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground transition group-hover:bg-primary/10 group-hover:text-primary">
          <FileText className="size-5" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{project.name}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="size-3" />
              {project.updatedAt}
            </span>
            {project.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}
