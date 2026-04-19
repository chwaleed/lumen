import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { features } from "@/app/(marketing)/components/landing-content";
import { SectionHeading } from "@/app/(marketing)/components/section-heading";

export function LandingFeatureGrid() {
  return (
    <section id="features" className="border-b border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-20">
        <SectionHeading
          eyebrow="Features"
          title="Everything a serious LaTeX writer needs."
          description="A focused editor, thoughtful project structure, and just enough intelligence to reduce friction without overwhelming the writing surface."
        />

        <div className="grid gap-px overflow-hidden rounded-[calc(var(--radius)*1.8)] border border-border bg-border lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card
                key={feature.title}
                className="rounded-none border-0 bg-background py-0 shadow-none ring-0"
              >
                <CardHeader className="px-6 pt-6">
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-panel text-muted-foreground">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="pt-3 text-lg">{feature.title}</CardTitle>
                  <CardDescription className="text-base leading-7">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6" />
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
