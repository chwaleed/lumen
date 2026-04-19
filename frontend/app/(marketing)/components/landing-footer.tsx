import Link from "next/link";
import { Sparkles } from "lucide-react";
import { navigationItems } from "@/app/(marketing)/components/landing-content";

type LandingFooterProps = {
  isAuthenticated: boolean;
};

export function LandingFooter({ isAuthenticated }: LandingFooterProps) {
  const accountHref = isAuthenticated ? "/dashboard" : "/login";
  const accountLabel = isAuthenticated ? "Dashboard" : "Log in";
  const secondaryHref = isAuthenticated ? "/dashboard" : "/signup";
  const secondaryLabel = isAuthenticated ? "Workspace" : "Sign up";

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <div className="flex flex-col">
            <span>TexAI</span>
            <span className="text-xs font-medium text-muted-foreground">
              AI-powered LaTeX editor
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {navigationItems.map((item) => (
            <a key={item.href} href={item.href} className="transition-colors hover:text-foreground">
              {item.label}
            </a>
          ))}
          <Link href={accountHref} className="transition-colors hover:text-foreground">
            {accountLabel}
          </Link>
          <Link href={secondaryHref} className="transition-colors hover:text-foreground">
            {secondaryLabel}
          </Link>
        </div>

        <div className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
          © 2026 TexAI
        </div>
      </div>
    </footer>
  );
}
