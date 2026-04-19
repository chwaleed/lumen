import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { audienceCards } from "@/app/(marketing)/components/landing-content";
import { SectionHeading } from "@/app/(marketing)/components/section-heading";

export function LandingAudience() {
  return (
    <section id="audience" className="border-b border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-20">
        <SectionHeading
          eyebrow="Built for"
          title="Serious writers across every discipline."
          description="TexAI is designed for people who use LaTeX as a real working tool, whether the job is a thesis, a paper, a deck, or a technical report."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {audienceCards.map((audience) => {
            const Icon = audience.icon;

            return (
              <Card key={audience.title} className="bg-background">
                <CardHeader className="px-6">
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-panel text-muted-foreground">
                    <Icon className="size-5" />
                  </div>
                  <div className="flex flex-col gap-2 pt-3">
                    <CardTitle className="text-xl">{audience.title}</CardTitle>
                    <CardDescription className="text-base leading-7">
                      {audience.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 px-6 pb-6">
                  {audience.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="h-auto rounded-full px-3 py-1.5">
                      {tag}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
