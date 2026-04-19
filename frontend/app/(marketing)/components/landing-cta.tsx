import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingCta() {
  return (
    <section className="px-6 py-20">
      <div className="landing-cta-pattern relative mx-auto max-w-6xl overflow-hidden rounded-[calc(var(--radius)*2.4)] bg-primary px-6 py-16 text-center text-primary-foreground sm:px-10">
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6">
          <h2 className="text-4xl font-semibold tracking-[-0.06em] text-balance sm:text-5xl">
            Your LaTeX workspace, now with an AI co-author.
          </h2>
          <p className="text-lg leading-8 text-primary-foreground/75">
            Open the editor today with no install, no setup detour, and a free
            tier that gets the writing started immediately.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href="/signup">
                <Sparkles data-icon="inline-start" />
                Open TexAI free
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="border border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link href="/login">
                View the editor
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
          <div className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-primary-foreground/55">
            Free tier available · Snapshot history · Export to PDF
          </div>
        </div>
      </div>
    </section>
  );
}
