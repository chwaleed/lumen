import Image from "next/image";

export function LandingTestimonial() {
  return (
    <section className="flex flex-col items-center justify-center border-t border-editorial-line bg-editorial-bg px-6 py-24 text-center md:px-12">
      <div className="mx-auto max-w-4xl">
        <p className="mb-10 text-[10px] font-semibold tracking-[0.3em] text-editorial-ink/50 uppercase">
          Trusted By Researchers
        </p>
        <h2 className="mb-12 font-serif text-3xl leading-tight text-editorial-ink italic md:text-5xl">
          &quot;TexAI reduced the time I spend formatting my CS papers by 80%. Translating English descriptions directly
          into complex TikZ figures is absolute magic.&quot;
        </h2>
        <div className="flex flex-col items-center">
          <div className="mb-4 size-12 overflow-hidden rounded-full border border-editorial-ink/20">
            <Image
              unoptimized
              src="https://api.dicebear.com/7.x/notionists/svg?seed=sarah&scale=120"
              alt="Dr. Sarah Chen"
              width={48}
              height={48}
              className="size-full object-cover grayscale"
            />
          </div>
          <span className="mb-1 block text-[10px] font-bold tracking-widest uppercase">Dr. Sarah Chen</span>
          <span className="font-serif text-xs text-editorial-ink/50 italic">
            Postdoctoral Researcher in Machine Learning
          </span>
        </div>
      </div>
    </section>
  );
}
