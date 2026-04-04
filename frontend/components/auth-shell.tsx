import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-border/70 bg-card/95 shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Lumen
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
          <p className="text-center text-sm text-muted-foreground">
            {footerText}{" "}
            <Link href={footerLinkHref} className="font-medium text-primary hover:underline">
              {footerLinkLabel}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

