import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeading } from "@/app/(marketing)/components/section-heading";
import { workflowSteps } from "@/app/(marketing)/components/landing-content";

export function LandingWorkflow() {
  return (
    <section id="workflow" className="border-b border-border bg-soft/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-20">
        <SectionHeading
          eyebrow="Workflow"
          title="From blank page to polished PDF in three steps."
          description="The experience is built to keep setup out of the way so the document can stay in focus."
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {workflowSteps.map((step) => (
            <Card key={step.number} className="gap-0 bg-background">
              <CardHeader className="gap-4 border-b border-border px-6 pb-6">
                <div className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
                  {step.number}
                </div>
                <div className="flex flex-col gap-2">
                  <CardTitle className="text-xl">{step.title}</CardTitle>
                  <CardDescription className="text-base leading-7">
                    {step.description}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="px-6 py-6">
                <div className="rounded-2xl border border-border bg-soft p-4 font-mono text-xs leading-6 text-muted-foreground">
                  {step.preview.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
