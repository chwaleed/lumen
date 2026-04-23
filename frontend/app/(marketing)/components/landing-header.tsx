"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";

type LandingHeaderProps = {
  isAuthenticated: boolean;
  isMobileMenuOpen: boolean;
  onMobileMenuChange: (isOpen: boolean) => void;
};

const navItems = [
  { href: "#features", label: "Features" },
  { href: "#marketplace", label: "Marketplace" },
  { href: "#pricing", label: "Pricing" },
];

function TexaiMark({ reversed = false }: { reversed?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      {!reversed ? (
        <span className="flex size-8 items-center justify-center bg-editorial-ink">
          <span className="font-serif text-xl text-editorial-paper italic">T</span>
        </span>
      ) : null}
      <span className="font-serif text-2xl tracking-tight uppercase italic">TexAI</span>
      {reversed ? (
        <span className="flex size-8 items-center justify-center bg-editorial-ink">
          <span className="font-serif text-xl text-editorial-paper italic">T</span>
        </span>
      ) : null}
    </span>
  );
}

export { TexaiMark };

export function LandingHeader({
  isAuthenticated,
  isMobileMenuOpen,
  onMobileMenuChange,
}: LandingHeaderProps) {
  const getStartedHref = isAuthenticated ? "/dashboard" : "/login";

  return (
    <>
      <nav className="relative z-50 flex items-center justify-between border-b border-editorial-line bg-transparent px-6 py-8 md:px-12">
        <Link href="/" aria-label="TexAI home">
          <TexaiMark />
        </Link>

        <div className="hidden gap-10 text-sm font-medium tracking-widest uppercase md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="transition-opacity hover:opacity-50">
              {item.label}
            </a>
          ))}
          <Link href={getStartedHref} className="border-b border-editorial-ink pb-0.5">
            Get Started
          </Link>
        </div>

        <div className="flex gap-4 text-sm font-medium md:hidden">
          <Button
            type="button"
            onClick={() => onMobileMenuChange(!isMobileMenuOpen)}
            className="relative z-50 h-auto rounded-none bg-editorial-ink px-4 py-2 text-xs font-medium tracking-widest text-editorial-paper uppercase hover:bg-editorial-ink/85"
          >
            {isMobileMenuOpen ? "Close" : "Menu"}
          </Button>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-10 bg-editorial-bg pb-20 md:hidden"
          >
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => onMobileMenuChange(false)}
                className="font-serif text-4xl italic transition-opacity hover:opacity-50"
              >
                {item.label}
              </a>
            ))}
            <Button asChild className="mt-8 h-auto rounded-none bg-editorial-ink px-12 py-5 text-xs font-bold tracking-widest text-editorial-paper uppercase hover:bg-editorial-ink/85">
              <Link href={getStartedHref}>Get Started</Link>
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
