import { Clock, FileText } from 'lucide-react';
import type { Key } from 'react';
import type { ProjectItem } from '@/src/projects/data/libraryData';

interface ProjectCardProps {
  key?: Key;
  project: ProjectItem;
  onOpenProject: (projectId: string) => void;
}

export function ProjectCard({ project, onOpenProject }: ProjectCardProps) {
  return (
    <div
      onClick={() => onOpenProject(project.id)}
      className="group flex items-center justify-between p-4 rounded-xl border border-transparent hover:border-border/50 hover:bg-muted/20 transition-all cursor-pointer"
    >
      <div className="flex items-center space-x-4">
        <div className="h-10 w-10 rounded bg-secondary/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-medium text-sm">{project.name}</h3>
          <div className="flex items-center mt-1 space-x-3">
            <span className="text-xs text-muted-foreground flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {project.updatedAt}
            </span>
            <div className="hidden sm:flex space-x-1">
              {project.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
