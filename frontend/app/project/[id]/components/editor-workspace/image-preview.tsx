"use client";

import { useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";

type ImagePreviewProps = {
  projectId: string | null;
  fileId: string;
  name: string;
};

/**
 * An uploaded image, shown at a readable size whatever its dimensions.
 *
 * Loads through the project's own authenticated route rather than the object
 * store's URL: that only worked on a public bucket, and when it failed the
 * pane showed a 135x26 broken-image icon with no explanation of what went
 * wrong or which file it was.
 *
 * Keyed by file id at the call site, so opening another image remounts this
 * and resets its state -- rather than an effect that resets on every change
 * and cascades a second render.
 */
export function ImagePreview({ projectId, fileId, name }: ImagePreviewProps) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);

  const source = projectId ? `/api/projects/${projectId}/files/${fileId}/raw` : null;

  if (!source) {
    return <Message icon={<ImageOff className="size-8" />} title="No image to show" />;
  }

  return (
    <div className="relative flex h-full min-h-0 w-full items-center justify-center overflow-auto bg-muted/10 p-6">
      {state === "loading" && (
        <Message
          icon={<Loader2 className="size-8 animate-spin text-primary" />}
          title={`Loading ${name}…`}
        />
      )}

      {state === "error" && (
        <Message
          icon={<ImageOff className="size-8 text-destructive" />}
          title={`${name} could not be loaded`}
          detail="The file may still be uploading, or storage may be unreachable."
        />
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={source}
        alt={name}
        // max-*-full keeps a 6000px-wide figure inside the pane instead of
        // forcing the whole editor to scroll sideways; object-contain keeps
        // its proportions rather than squashing it to fit.
        className={`max-h-full max-w-full rounded-md border border-border bg-background object-contain shadow-sm ${
          state === "ready" ? "" : "hidden"
        }`}
        onLoad={(event) => {
          const image = event.currentTarget;
          setNatural({ width: image.naturalWidth, height: image.naturalHeight });
          setState("ready");
        }}
        onError={() => setState("error")}
      />

      {state === "ready" && natural && (
        // Worth saying: the image is scaled to fit, so "it looks small" and
        // "it is small" are otherwise indistinguishable.
        <span className="absolute bottom-2 right-3 rounded bg-background/80 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          {natural.width} × {natural.height}
        </span>
      )}
    </div>
  );
}

function Message({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
      {icon}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {detail ? <p className="max-w-xs text-xs">{detail}</p> : null}
    </div>
  );
}
