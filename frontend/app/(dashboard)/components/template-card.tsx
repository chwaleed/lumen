import { Badge } from "@/components/ui/badge";
import type { TemplateItem } from "@/app/(dashboard)/data/library-data";

const TONE_CLASSES: Record<TemplateItem["tone"], string> = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary text-secondary-foreground",
  accent: "bg-accent text-accent-foreground",
  muted: "bg-muted text-muted-foreground",
  "chart-1": "bg-chart-1/20 text-foreground",
  "chart-2": "bg-chart-2/20 text-foreground",
};

type TemplateCardProps = {
  template: TemplateItem;
  onCreateProject: (templateId: string) => void | Promise<void>;
  isCreating?: boolean;
};

export function TemplateCard({ template, onCreateProject, isCreating = false }: TemplateCardProps) {
  const Icon = template.icon;

  return (
    <button
      type="button"
      onClick={() => void onCreateProject(template.id)}
      disabled={isCreating}
      className="group flex w-full items-center gap-4 overflow-hidden rounded-xl border border-border/70 bg-card p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
    >
      <div className={`flex size-12 items-center justify-center rounded-lg ${TONE_CLASSES[template.tone]}`}>
        <Icon className="size-6" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-medium transition group-hover:text-primary">{template.name}</p>
        <p className="truncate text-xs text-muted-foreground">{template.description}</p>
        {template.isCustom ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">by {template.author}</span>
            {template.price && template.price > 0 ? (
              <Badge variant="secondary" className="h-4 px-1.5 py-0 text-[10px]">
                ${template.price.toFixed(2)}
              </Badge>
            ) : (
              <Badge variant="secondary" className="h-4 px-1.5 py-0 text-[10px]">
                Free
              </Badge>
            )}
          </div>
        ) : null}
      </div>
    </button>
  );
}
