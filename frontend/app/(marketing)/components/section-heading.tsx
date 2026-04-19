type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
        {eyebrow}
      </div>
      <div className="flex flex-col gap-3">
        <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.05em] text-balance sm:text-4xl">
          {title}
        </h2>
        <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
          {description}
        </p>
      </div>
    </div>
  );
}
