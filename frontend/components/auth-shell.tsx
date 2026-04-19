import Link from "next/link";
import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthShellProps = {
  title: string;
  subtitle: string;
  footerText: string;
  footerLinkLabel: string;
  footerLinkHref: string;
  children: React.ReactNode;
};

export function AuthShell({
  title,
  subtitle,
  footerText,
  footerLinkLabel,
  footerLinkHref,
  children,
}: AuthShellProps) {
  return (
    <main className="auth-page-backdrop flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-2xl font-semibold tracking-[-0.05em]">
            <Sparkles className="size-5 text-primary" />
            <span>TexAI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Precision in every character.
          </p>
        </div>

        <Card className="auth-card-shadow w-full rounded-[calc(var(--radius)*2.2)] border-border/60 bg-card/95 py-0 ring-1 ring-foreground/5">
          <CardHeader className="gap-3 px-7 pt-8 text-left sm:px-8">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" />
              Mindful workspace
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-3xl tracking-[-0.05em]">{title}</CardTitle>
              <CardDescription className="text-sm leading-6">
                {subtitle}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-7 pb-8 sm:px-8">
          {children}
          </CardContent>
        </Card>

        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            {footerText}{" "}
            <Link href={footerLinkHref} className="font-medium text-foreground hover:text-primary">
              {footerLinkLabel}
            </Link>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
            <span>© 2026 TexAI</span>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Documentation</span>
          </div>
        </div>
      </div>
    </main>
  );
}
