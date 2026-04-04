import type { Key } from "react";
import { Badge } from "@/components/ui/badge";

type TemplateItem = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  color: string;
  isCustom?: boolean;
  author?: string;
  price?: number;
};

interface TemplateCardProps {
  key?: Key;
  template: TemplateItem;
  onOpenProject: (projectId: string) => void;
}

export function TemplateCard({ template, onOpenProject }: TemplateCardProps) {
  return (
    <div
      onClick={() => onOpenProject(template.id)}
      className="group flex items-center p-4 rounded-xl border border-border/50 bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
    >
      <div
        className={`h-12 w-12 rounded-lg flex items-center justify-center mr-4 ${template.bg} ${template.color}`}
      >
        <template.icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-medium group-hover:text-primary transition-colors">
          {template.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
          {template.description}
        </p>
        {template.isCustom && (
          <div className="flex items-center mt-1 space-x-2">
            <span className="text-[10px] text-muted-foreground">
              by {template.author}
            </span>
            {template.price && template.price > 0 ? (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4 bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900"
              >
                ${template.price.toFixed(2)}
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4"
              >
                Free
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
