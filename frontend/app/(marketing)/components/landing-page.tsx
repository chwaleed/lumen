import { LandingAudience } from "@/app/(marketing)/components/landing-audience";
import { LandingCta } from "@/app/(marketing)/components/landing-cta";
import { LandingFeatureGrid } from "@/app/(marketing)/components/landing-feature-grid";
import { LandingFooter } from "@/app/(marketing)/components/landing-footer";
import { LandingHeader } from "@/app/(marketing)/components/landing-header";
import { LandingHero } from "@/app/(marketing)/components/landing-hero";
import { LandingShowcase } from "@/app/(marketing)/components/landing-showcase";
import { LandingStats } from "@/app/(marketing)/components/landing-stats";
import { LandingWorkflow } from "@/app/(marketing)/components/landing-workflow";

type LandingPageProps = {
  isAuthenticated: boolean;
};

export function LandingPage({ isAuthenticated }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader isAuthenticated={isAuthenticated} />
      <main>
        <LandingHero />
        <LandingShowcase />
        <LandingStats />
        <LandingFeatureGrid />
        <LandingWorkflow />
        <LandingAudience />
        <LandingCta isAuthenticated={isAuthenticated} />
      </main>
      <LandingFooter isAuthenticated={isAuthenticated} />
    </div>
  );
}
