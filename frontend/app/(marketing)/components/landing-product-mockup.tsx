import { FileText, WandSparkles } from "lucide-react";
import { motion } from "motion/react";

export function LandingProductMockup() {
  return (
    <div className="relative flex min-h-[500px] items-center justify-center overflow-hidden bg-editorial-alt-bg p-6 md:p-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="editorial-product-shadow relative z-10 flex w-full max-w-[640px] flex-col rounded-sm bg-editorial-paper md:flex-row"
      >
        <div className="flex flex-1 flex-col border-b border-editorial-line md:border-r md:border-b-0">
          <div className="flex h-10 items-center justify-between border-b border-editorial-line bg-editorial-bg px-4">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-editorial-line" />
              <span className="size-2.5 rounded-full bg-editorial-line" />
              <span className="size-2.5 rounded-full bg-editorial-line" />
            </div>
            <span className="font-mono text-[10px] text-editorial-ink/40">main.tex</span>
            <span className="size-4" />
          </div>

          <div className="overflow-x-auto p-6 font-mono text-[13px] leading-relaxed text-editorial-ink/75">
            <div className="mb-4 opacity-70">
              <span className="editorial-token-keyword">\documentclass</span>
              <span className="editorial-token-function">&#123;article&#125;</span>
              <br />
              <span className="editorial-token-keyword">\begin</span>
              <span className="editorial-token-function">&#123;document&#125;</span>
            </div>

            <div className="editorial-equation-shadow relative my-2 border-l-2 border-editorial-blue bg-editorial-blue/5 py-2 pl-4">
              <span className="absolute top-2.5 -left-6 flex size-4 items-center justify-center rounded-full border border-editorial-blue/15 bg-editorial-paper shadow">
                <WandSparkles className="size-2.5 text-editorial-blue" />
              </span>
              <span className="editorial-token-comment">% Define the Schrodinger equation</span>
              <br />
              <span className="editorial-token-keyword">\begin</span>
              <span className="editorial-token-function">&#123;equation&#125;</span>
              <br />
              &nbsp;&nbsp;i\hbar <span className="editorial-token-keyword">\frac</span>
              &#123;<span className="editorial-token-keyword">\partial</span>&#125;&#123;
              <span className="editorial-token-keyword">\partial</span> t&#125; \Psi(\mathbf&#123;r&#125;,t) =
              \hat&#123;H&#125; \Psi(\mathbf&#123;r&#125;,t)
              <br />
              <span className="editorial-token-keyword">\end</span>
              <span className="editorial-token-function">&#123;equation&#125;</span>
              <br />
            </div>

            <div className="mt-4 opacity-70">
              <span className="editorial-token-keyword">\end</span>
              <span className="editorial-token-function">&#123;document&#125;</span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col bg-editorial-paper text-editorial-ink">
          <div className="flex h-10 items-center justify-center gap-2 border-b border-editorial-line bg-editorial-bg px-4 text-editorial-ink/50">
            <FileText className="size-3.5 opacity-50" />
            <span className="text-[10px] font-medium tracking-[0.1em] uppercase opacity-50">Preview</span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center p-8">
            <div className="flex aspect-[1/1.2] w-full items-center justify-center border border-editorial-line bg-editorial-paper p-8 font-serif shadow-sm">
              <div className="text-center text-lg text-editorial-ink lg:text-xl">
                <span className="italic">i</span>h{" "}
                <span className="relative inline-block px-1 align-middle">
                  <span className="block border-b border-editorial-ink pb-px text-[0.85em] leading-none">d</span>
                  <span className="block pt-px text-[0.85em] leading-none">dt</span>
                </span>{" "}
                Psi(<span className="font-bold">r</span>,t) = H Psi(<span className="font-bold">r</span>,t)
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, rotate: -20 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ delay: 0.8 }}
        className="absolute right-12 bottom-12 z-20 hidden size-32 items-center justify-center rounded-full border border-editorial-line bg-editorial-alt-bg p-4 text-center shadow-xl backdrop-blur-sm md:flex lg:right-16 lg:bottom-16"
      >
        <span className="text-[10px] leading-tight font-bold tracking-widest uppercase">
          99% Accuracy Guaranteed
        </span>
      </motion.div>
    </div>
  );
}
