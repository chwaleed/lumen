import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type LandingHeroProps = {
  isAuthenticated: boolean;
};

export function LandingHero({ isAuthenticated }: LandingHeroProps) {
  const primaryHref = isAuthenticated ? "/templates" : "/signup";
  const primaryLabel = isAuthenticated ? "Start a fresh document" : "Open TexAI free";
  const secondaryHref = isAuthenticated ? "#features" : "#showcase";
  const secondaryLabel = isAuthenticated ? "Explore features" : "See the workspace";

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="landing-hero-backdrop absolute inset-0" />
      <div className="landing-grid-overlay absolute inset-x-0 top-0 h-80" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-20 text-center sm:px-6 sm:py-32">
        <Badge
          variant="outline"
          className="hidden h-auto max-w-full rounded-full bg-background/80 px-4 py-2 font-mono text-[0.68rem] tracking-[0.14em] uppercase text-muted-foreground sm:inline-flex sm:text-[0.7rem] sm:tracking-[0.18em]"
        >
          <span className="rounded-full bg-primary px-2 py-1 text-[0.6rem] font-semibold tracking-[0.22em] text-primary-foreground">
            New
          </span>
          AI-assisted LaTeX drafting with live preview
        </Badge>

        <div className="flex max-w-4xl flex-col gap-6">
          <h1 className="text-4xl font-semibold tracking-[-0.08em] text-balance sm:text-6xl lg:text-7xl">
            A sharper landing place for
            <span className="block text-muted-foreground">
              research papers, slides, and serious writing.
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground sm:text-xl sm:leading-8">
            TexAI pairs an intentional LaTeX workspace with inline AI help, live
            preview, and snapshot history so the writing flow stays intact.
          </p>
        </div>

        <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <Button asChild size="lg">
            <Link href={primaryHref}>
              <Sparkles data-icon="inline-start" />
              {primaryLabel}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={secondaryHref}>
              {secondaryLabel}
              <ArrowRight data-icon="inline-end" />
            </a>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-[0.68rem] tracking-[0.1em] uppercase text-muted-foreground sm:text-xs sm:tracking-[0.12em]">
          <span>No TeX install</span>
          <span className="text-border">/</span>
          <span>Live compile feedback</span>
          <span className="text-border">/</span>
          <span>PDF export</span>
        </div>
      </div>
    </section>
  );
}
