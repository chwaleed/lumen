export function LandingFooter() {
  return (
    <footer className="flex h-auto flex-col items-center justify-between gap-4 border-t border-editorial-line bg-editorial-paper px-6 py-6 md:h-16 md:flex-row md:px-12">
      <div className="text-center font-serif text-[9px] font-medium tracking-[0.2em] text-editorial-ink/40 uppercase italic md:text-left">
        ©{new Date().getFullYear()} TexAI Systems • Designed for Academic Excellence
      </div>
      <div className="flex gap-8 text-[9px] font-medium tracking-[0.2em] uppercase">
        <span>Version 2.4.0-stable</span>
        <span className="font-bold text-editorial-blue">Systems Operational</span>
      </div>
    </footer>
  );
}
