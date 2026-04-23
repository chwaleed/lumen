"use client";

import { useState } from "react";
import { LandingCta } from "@/app/(marketing)/components/landing-cta";
import { LandingFeatureGrid } from "@/app/(marketing)/components/landing-feature-grid";
import { LandingFooter } from "@/app/(marketing)/components/landing-footer";
import { LandingHeader } from "@/app/(marketing)/components/landing-header";
import { LandingHero } from "@/app/(marketing)/components/landing-hero";
import { LandingMarketplace } from "@/app/(marketing)/components/landing-marketplace";
import { LandingPricing } from "@/app/(marketing)/components/landing-pricing";
import { LandingTestimonial } from "@/app/(marketing)/components/landing-testimonial";
import { LandingTrustedBy } from "@/app/(marketing)/components/landing-trusted-by";

type LandingPageProps = {
  isAuthenticated: boolean;
};

export function LandingPage({ isAuthenticated }: LandingPageProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="editorial-page relative min-h-screen overflow-x-hidden font-sans selection:bg-editorial-blue/30">
      <div className="relative z-10 flex min-h-screen flex-col">
        <LandingHeader
          isAuthenticated={isAuthenticated}
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuChange={setIsMobileMenuOpen}
        />
        <main className="flex-1">
          <LandingHero isAuthenticated={isAuthenticated} />
          <LandingTrustedBy />
          <LandingFeatureGrid />
          <LandingTestimonial />
          <LandingMarketplace />
          <LandingPricing />
          <LandingCta isAuthenticated={isAuthenticated} />
        </main>
        <LandingFooter />
      </div>
    </div>
  );
}
