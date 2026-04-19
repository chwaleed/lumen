import { heroMetrics } from "@/app/(marketing)/components/landing-content";

export function LandingStats() {
  return (
    <section className="border-b border-border bg-soft/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {heroMetrics.map((metric) => (
          <div key={metric.label} className="text-center">
            <div className="text-3xl font-semibold tracking-[-0.05em]">{metric.value}</div>
            <div className="mt-2 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
              {metric.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
