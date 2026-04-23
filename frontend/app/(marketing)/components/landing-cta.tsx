import Link from "next/link";
import { Button } from "@/components/ui/button";

type LandingCtaProps = {
  isAuthenticated: boolean;
};

export function LandingCta({ isAuthenticated }: LandingCtaProps) {
  return (
    <section className="relative overflow-hidden border-t border-editorial-line bg-editorial-paper px-6 py-32 text-center md:py-48">
      <div className="editorial-dot-pattern pointer-events-none absolute inset-0 bg-[length:24px_24px] opacity-[0.03]" />
      <div className="relative z-10">
        <h2 className="mx-auto mb-8 max-w-4xl font-serif text-5xl leading-tight italic md:text-[84px]">
          Ready to focus on your findings?
        </h2>
        <p className="mx-auto mb-12 max-w-2xl font-serif text-xl font-light text-editorial-ink/50 italic md:text-2xl">
          Join thousands of academics and researchers who have already made the switch to the modern standard.
        </p>
        <Button
          asChild
          className="h-auto max-w-full rounded-none bg-editorial-ink px-6 py-5 text-center text-[10px] leading-relaxed font-bold whitespace-normal tracking-[0.14em] text-editorial-paper uppercase shadow-2xl transition-transform duration-300 hover:-translate-y-1 hover:bg-editorial-ink/85 sm:px-10 sm:py-6 sm:text-[11px] sm:tracking-[0.2em] md:px-12"
        >
          <Link href={isAuthenticated ? "/dashboard" : "/signup"}>Start Writing Now - It&apos;s Free</Link>
        </Button>
      </div>
    </section>
  );
}
