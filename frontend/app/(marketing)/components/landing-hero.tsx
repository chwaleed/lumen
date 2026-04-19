import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="landing-hero-backdrop absolute inset-0" />
      <div className="landing-grid-overlay absolute inset-x-0 top-0 h-80" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 py-24 text-center sm:py-32">
        <Badge
          variant="outline"
          className="h-auto rounded-full bg-background/80 px-4 py-2 font-mono text-[0.7rem] tracking-[0.18em] uppercase text-muted-foreground"
        >
          <span className="rounded-full bg-primary px-2 py-1 text-[0.6rem] font-semibold tracking-[0.22em] text-primary-foreground">
            New
          </span>
          AI-assisted LaTeX drafting with live preview
        </Badge>

        <div className="flex max-w-4xl flex-col gap-6">
          <h1 className="text-5xl font-semibold tracking-[-0.08em] text-balance sm:text-6xl lg:text-7xl">
            A sharper landing place for
            <span className="block text-muted-foreground">
              research papers, slides, and serious writing.
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            TexAI pairs an intentional LaTeX workspace with inline AI help, live
            preview, and snapshot history so the writing flow stays intact.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">
              <Sparkles data-icon="inline-start" />
              Open TexAI free
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#showcase">
              See the workspace
              <ArrowRight data-icon="inline-end" />
            </a>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-xs tracking-[0.12em] uppercase text-muted-foreground">
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
