const institutions = ["Stanford", "MIT", "OXFORD", "ETH Zurich", "Cambridge"];

export function LandingTrustedBy() {
  return (
    <section className="overflow-hidden border-t border-editorial-line bg-editorial-bg px-6 py-16 md:px-12">
      <p className="mb-10 text-center text-[10px] font-semibold tracking-[0.3em] text-editorial-ink/50 uppercase">
        Transforming Technical Writing At
      </p>
      <div className="flex flex-wrap items-center justify-center gap-12 opacity-50 grayscale transition-all duration-500 hover:grayscale-0 md:gap-24">
        {institutions.map((institution) => (
          <span key={institution} className="font-serif text-2xl font-bold italic">
            {institution}
          </span>
        ))}
      </div>
    </section>
  );
}
