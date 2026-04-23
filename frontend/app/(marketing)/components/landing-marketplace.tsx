export function LandingMarketplace() {
  return (
    <section id="marketplace" className="grid border-t border-editorial-line bg-editorial-paper lg:grid-cols-2">
      <div className="relative flex items-center justify-center overflow-hidden border-b border-editorial-line bg-editorial-alt-bg p-12 md:p-24 lg:border-r lg:border-b-0">
        <div className="relative w-full max-w-sm border border-editorial-line bg-editorial-paper p-6 text-center font-sans shadow-2xl">
          <h4 className="mb-2 font-serif text-xl italic">Modern Resume Template</h4>
          <div className="mb-6 text-3xl font-light">$15.00</div>
          <div className="mb-4 w-full bg-editorial-ink py-3 text-xs font-bold tracking-widest text-editorial-paper uppercase transition-colors hover:bg-editorial-ink/85">
            Buy Template
          </div>
          <div className="flex items-center justify-between border-t border-editorial-line pt-4 text-xs text-editorial-ink/50">
            <span>Creator: Dr. Sarah C.</span>
            <span>4,210 Sales</span>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col justify-center p-12 md:p-24">
        <p className="mb-6 text-[10px] font-semibold tracking-[0.3em] text-editorial-ink/50 uppercase">
          Creator Marketplace
        </p>
        <h2 className="mb-8 font-serif text-4xl leading-[1.1] italic md:text-[56px]">
          Monetize your <br />
          masterpieces.
        </h2>
        <p className="mb-10 max-w-sm text-lg leading-relaxed font-light text-editorial-muted">
          Built a beautiful thesis template or a sleek resume? Our premium plan lets you instantly publish and sell your
          LaTeX templates to a global network of researchers and students.
        </p>
        <ul className="mb-10 flex flex-col gap-4 text-sm font-light text-editorial-ink/70">
          {["Keep 90% of all template revenue", "Automated delivery and licensing", "Payouts directly to your bank account"].map(
            (item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="size-1.5 bg-editorial-ink" />
                {item}
              </li>
            ),
          )}
        </ul>
      </div>
    </section>
  );
}
