import { Badge } from "@/components/ui/badge";
import { LandingDashboardShowcase } from "@/app/(marketing)/components/landing-dashboard-showcase";
import { LandingEditorShowcase } from "@/app/(marketing)/components/landing-editor-showcase";

export function LandingShowcase() {
  return (
    <section
      id="showcase"
      className="border-b border-border bg-gradient-to-b from-background via-background to-soft/60"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex justify-center">
          <Badge
            variant="outline"
            className="h-auto rounded-full bg-background px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground"
          >
            Product walkthrough
          </Badge>
        </div>
        <LandingDashboardShowcase />
        <LandingEditorShowcase />
      </div>
    </section>
  );
}
