"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { LandingProductMockup } from "@/app/(marketing)/components/landing-product-mockup";

type LandingHeroProps = {
  isAuthenticated: boolean;
};

export function LandingHero({ isAuthenticated }: LandingHeroProps) {
  const primaryHref = isAuthenticated ? "/dashboard" : "/signup";

  return (
    <section className="grid min-h-[calc(100vh-100px)] lg:grid-cols-12">
      <div className="flex flex-col justify-between px-6 py-16 md:px-12 lg:col-span-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="mb-6 text-[10px] font-semibold tracking-[0.3em] text-editorial-ink/50 uppercase">
            The AI-Powered LaTeX Editor
          </p>
          <h1 className="mb-8 font-serif text-6xl leading-[0.85] italic md:text-[84px]">
            Write <br className="hidden md:block" />{" "}
            <span className="md:pl-8">Intelligent</span> <br className="hidden md:block" /> Papers.
          </h1>
          <p className="mb-10 max-w-[340px] text-lg leading-relaxed font-light text-editorial-muted">
            Your complete AI editor. TexAI interprets your mathematical intuition, automating complex boilerplate while
            you focus on the discovery.
          </p>
          <div className="flex items-center gap-6">
            <Button
              asChild
              className="h-auto rounded-none bg-editorial-ink px-8 py-4 text-center text-xs tracking-widest text-editorial-paper uppercase hover:bg-editorial-ink/85 md:px-10"
            >
              <Link href={primaryHref}>Start Writing</Link>
            </Button>
            <span className="hidden font-serif text-[10px] italic md:block">
              100% web-based editor. <br /> No installation required.
            </span>
          </div>
        </motion.div>

        <div className="mt-16 grid grid-cols-2 gap-8 border-t border-editorial-line pt-8 lg:mt-0">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <h4 className="mb-2 text-[10px] font-bold tracking-wider text-editorial-ink/40 uppercase">Performance</h4>
            <p className="font-serif text-xl tracking-tight italic md:text-2xl">0.04s Compile</p>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <h4 className="mb-2 text-[10px] font-bold tracking-wider text-editorial-ink/40 uppercase">Intelligence</h4>
            <p className="font-serif text-xl tracking-tight italic md:text-2xl">Contextual ML</p>
          </motion.div>
        </div>
      </div>

      <div className="lg:col-span-7">
        <LandingProductMockup />
      </div>
    </section>
  );
}
