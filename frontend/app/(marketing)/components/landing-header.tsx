import Link from "next/link";
import { FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { navigationItems } from "@/app/(marketing)/components/landing-content";

type LandingHeaderProps = {
  isAuthenticated: boolean;
};

export function LandingHeader({ isAuthenticated }: LandingHeaderProps) {
  const primaryHref = isAuthenticated ? "/dashboard" : "/signup";
  const primaryLabel = isAuthenticated ? "Open dashboard" : "Start writing";
  const secondaryHref = isAuthenticated ? "/dashboard" : "/login";
  const secondaryLabel = isAuthenticated ? "Dashboard" : "Log in";

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 text-sm font-semibold tracking-[-0.02em]"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-4" />
          </span>
          <span className="flex flex-col">
            <span>TexAI</span>
            <span className="text-xs font-medium text-muted-foreground">
              AI-native LaTeX editor
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navigationItems.map((item) => (
            <Button key={item.href} asChild variant="ghost" size="sm">
              <a href={item.href}>{item.label}</a>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={primaryHref}>
              <FileText data-icon="inline-start" />
              {primaryLabel}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
