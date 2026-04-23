import { Sparkles, SquareTerminal, Zap } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Compilation",
    description:
      "Changes render in milliseconds. See your complex mathematical formulas appear instantly alongside your code.",
  },
  {
    icon: SquareTerminal,
    title: "AI Debugger",
    description:
      "Cryptic LaTeX errors are translated into plain English, with one-click automatic fixes for missing brackets.",
  },
  {
    icon: Sparkles,
    title: "AI Advertising",
    description:
      "Automatically generate high-converting marketing copy and social media posts for the templates you sell on the marketplace.",
  },
];

export function LandingFeatureGrid() {
  return (
    <section id="features" className="border-t border-editorial-line bg-editorial-paper px-6 py-24 md:px-12 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 grid items-end gap-8 md:grid-cols-2">
          <div>
            <p className="mb-4 text-[10px] font-semibold tracking-[0.3em] text-editorial-ink/50 uppercase">
              Complete AI Editor
            </p>
            <h2 className="font-serif text-4xl leading-none italic md:text-[56px]">
              An assistant inside
              <br />
              your documents.
            </h2>
          </div>
          <p className="max-w-sm text-lg leading-relaxed font-light text-editorial-muted">
            Stop fighting compiler errors and memorizing arcane syntax. Focus on your research, let our intelligence
            handle the formatting.
          </p>
        </div>

        <div className="grid border-t border-l border-editorial-line md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group flex cursor-default flex-col items-start border-r border-b border-editorial-line p-10 transition-colors hover:bg-editorial-bg"
              >
                <div className="mb-10 flex size-10 items-center justify-center border border-editorial-ink/20 text-editorial-ink transition-all duration-500 will-change-transform group-hover:scale-110 group-hover:bg-editorial-ink group-hover:text-editorial-paper">
                  <Icon className="size-5 transition-colors duration-300" />
                </div>
                <h3 className="mb-4 text-sm font-bold tracking-widest uppercase">{feature.title}</h3>
                <p className="text-sm leading-relaxed font-light text-editorial-muted">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
