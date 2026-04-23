import Link from "next/link";
import { Button } from "@/components/ui/button";

const standardFeatures = [
  "AI-Powered Editor & Autocomplete",
  "Create unlimited projects",
  "Fast PDF Compilation",
  "Sell your templates",
];

const creatorFeatures = [
  "All Standard features",
  "Sell your templates on the marketplace",
  "Set your own prices",
  "Analytics & Sales insights",
];

export function LandingPricing() {
  return (
    <section id="pricing" className="border-t border-editorial-line bg-editorial-bg px-6 py-24 md:px-12 md:py-32">
      <div className="mb-20 text-center">
        <p className="mb-6 text-[10px] font-semibold tracking-[0.3em] text-editorial-ink/50 uppercase">
          Simple Pricing
        </p>
        <h2 className="font-serif text-4xl leading-none italic md:text-[56px]">Choose your path.</h2>
      </div>

      <div className="mx-auto grid max-w-4xl border border-editorial-line bg-editorial-paper shadow-xl md:grid-cols-2">
        <div className="flex flex-col items-start border-b border-editorial-line p-10 transition-colors hover:bg-editorial-bg md:border-r md:border-b-0 lg:p-12">
          <h3 className="mb-4 text-[10px] font-bold tracking-[0.2em] text-editorial-ink/50 uppercase">Standard</h3>
          <div className="mb-8 flex items-baseline gap-2">
            <span className="font-serif text-5xl italic">$0</span>
            <span className="font-serif text-xs text-editorial-ink/50 italic">/ forever</span>
          </div>
          <ul className="mb-12 flex flex-1 flex-col gap-5 text-sm font-light text-editorial-ink/70">
            {standardFeatures.map((feature, index) => (
              <li key={feature} className={`flex items-center gap-3 ${index === 3 ? "opacity-40" : ""}`}>
                <span className={index === 3 ? "size-1.5 border border-editorial-ink/20" : "size-1.5 bg-editorial-ink/20"} />
                {feature}
              </li>
            ))}
          </ul>
          <Button
            asChild
            variant="outline"
            className="h-auto w-full rounded-none border-editorial-ink/20 bg-transparent py-4 text-[10px] font-bold tracking-widest text-editorial-ink uppercase hover:bg-editorial-ink hover:text-editorial-paper"
          >
            <Link href="/signup">Start Free</Link>
          </Button>
        </div>

        <div className="relative z-10 flex flex-col items-start border-b border-editorial-line bg-editorial-ink p-10 text-editorial-paper shadow-2xl md:scale-[1.02] lg:border-b-0 lg:p-12">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 border border-editorial-line bg-editorial-paper px-4 py-1.5 text-[9px] font-bold tracking-widest text-editorial-ink uppercase shadow-sm">
            Premium Creator
          </div>
          <h3 className="mb-4 text-[10px] font-bold tracking-[0.2em] text-editorial-paper/50 uppercase">Creator</h3>
          <div className="mb-8 flex items-baseline gap-2">
            <span className="font-serif text-5xl italic">$9</span>
            <span className="font-serif text-xs text-editorial-paper/50 italic">/ month</span>
          </div>
          <ul className="mb-12 flex flex-1 flex-col gap-5 text-sm font-light text-editorial-paper/80">
            {creatorFeatures.map((feature, index) => (
              <li key={feature} className={`flex items-center gap-3 ${index === 1 ? "font-medium text-editorial-paper" : ""}`}>
                <span className={`size-1.5 bg-editorial-paper ${index === 1 ? "editorial-feature-glow" : ""}`} />
                {feature}
              </li>
            ))}
          </ul>
          <Button
            asChild
            className="h-auto w-full rounded-none border border-transparent bg-editorial-paper py-4 text-[10px] font-bold tracking-widest text-editorial-ink uppercase hover:border-editorial-paper hover:bg-transparent hover:text-editorial-paper"
          >
            <Link href="/signup">Upgrade to Creator</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
