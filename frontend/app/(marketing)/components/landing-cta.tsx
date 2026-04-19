import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type LandingCtaProps = {
  isAuthenticated: boolean;
};

export function LandingCta({ isAuthenticated }: LandingCtaProps) {
  const primaryHref = isAuthenticated ? "/projects" : "/signup";
  const primaryLabel = isAuthenticated ? "Create a new project" : "Open TexAI free";
  const secondaryHref = isAuthenticated ? "/templates" : "/login";
  const secondaryLabel = isAuthenticated ? "Browse templates" : "View the editor";

  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="landing-cta-pattern relative mx-auto max-w-6xl overflow-hidden rounded-[calc(var(--radius)*2.4)] bg-primary px-5 py-14 text-center text-primary-foreground sm:px-10 sm:py-16">
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6">
          <h2 className="text-3xl font-semibold tracking-[-0.06em] text-balance sm:text-5xl">
            Your LaTeX workspace, now with an AI co-author.
          </h2>
          <p className="text-base leading-7 text-primary-foreground/75 sm:text-lg sm:leading-8">
            Open the editor today with no install, no setup detour, and a free
            tier that gets the writing started immediately.
          </p>
          <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Button asChild size="lg" variant="secondary">
              <Link href={primaryHref}>
                <Sparkles data-icon="inline-start" />
                {primaryLabel}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              className="border border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link href={secondaryHref}>
                {secondaryLabel}
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
