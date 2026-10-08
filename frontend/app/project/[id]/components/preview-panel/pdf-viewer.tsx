"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus } from "lucide-react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { PdfPage } from "./pdf-page";

type PdfViewerProps = {
  src: string;
  title: string;
};

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.15;

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * The compiled PDF, rendered by pdf.js with a toolbar of our own.
 *
 * This replaced an <iframe> onto Chrome's built-in viewer. That viewer's
 * toolbar cannot be restyled or driven from JavaScript -- only replaced -- and
 * it took ~40px off a pane that is already only a third of the window. Owning
 * the rendering is also what SyncTeX click-to-source and error markers drawn
 * over the page will need.
 *
 * ponytail: no virtualised list. Pages render lazily and tear down once off
 * screen (see PdfPage), which is enough for a thesis; reach for windowing if
 * a document ever arrives where the placeholders alone are too much DOM.
 */
export function PdfViewer({ src, title }: PdfViewerProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const pageWidthRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Teardown lives on the loading task, not the document: destroying the
    // task is what stops the worker and frees the parsed document.
    let loadingTask: PDFDocumentLoadingTask | null = null;

    void (async () => {
      const pdfjs = await import("pdfjs-dist");
      // The worker ships with the package; this hands the bundler the real
      // file rather than a CDN URL, which the artifact CSP would block anyway.
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      try {
        loadingTask = pdfjs.getDocument({ url: src });
        const loaded = await loadingTask.promise;
        if (cancelled) {
          return;
        }
        setDocument(loaded);
        setError(null);
      } catch {
        if (!cancelled) {
          setError("This PDF could not be opened.");
        }
      }
    })();

    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [src]);

  // Record the unscaled page width once, so "fit" can be computed without
  // asking the document again on every resize.
  const onPageSize = useCallback(
    (pageNumber: number, width: number) => {
      if (pageNumber === 1) {
        pageWidthRef.current = width / scale;
      }
    },
    [scale],
  );

  const fitWidth = useCallback(() => {
    const container = scrollRef.current;
    const naturalWidth = pageWidthRef.current;
    if (!container || !naturalWidth) {
      return;
    }
    // Leave room for the scrollbar and the page's own margin.
    setScale(clampScale((container.clientWidth - 32) / naturalWidth));
  }, []);

  // Fit on first load, so a thesis does not open at an arbitrary zoom.
  const hasFittedRef = useRef(false);
  useEffect(() => {
    if (document && !hasFittedRef.current && pageWidthRef.current) {
      hasFittedRef.current = true;
      fitWidth();
    }
  });

  useEffect(() => {
    hasFittedRef.current = false;
  }, [src]);

  const goToPage = useCallback(
    (pageNumber: number) => {
      const container = scrollRef.current;
      if (!container || !document) {
        return;
      }
      const target = Math.min(Math.max(1, pageNumber), document.numPages);
      const element = container.querySelector(`[data-page="${target}"]`);
      element?.scrollIntoView({ block: "start" });
      setCurrentPage(target);
    },
    [document],
  );

  // Track the page nearest the top of the viewport for the page indicator.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !document) {
      return;
    }
    const onScroll = () => {
      const pages = container.querySelectorAll<HTMLElement>("[data-page]");
      const top = container.getBoundingClientRect().top;
      let nearest = 1;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const page of pages) {
        const distance = Math.abs(page.getBoundingClientRect().top - top);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = Number(page.dataset.page);
        }
      }
      setCurrentPage(nearest);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [document]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-muted/30" aria-label={title}>
      <div className="flex shrink-0 items-center gap-1 border-b bg-card px-2 py-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Previous page"
          disabled={!document || currentPage <= 1}
          onClick={() => goToPage(currentPage - 1)}
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-16 text-center font-mono text-xs text-muted-foreground">
          {document ? `${currentPage} / ${document.numPages}` : "–"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Next page"
          disabled={!document || currentPage >= document.numPages}
          onClick={() => goToPage(currentPage + 1)}
        >
          <ChevronRight />
        </Button>

        <div className="mx-1 h-4 w-px bg-border" />

        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Zoom out"
          onClick={() => setScale((value) => clampScale(value - ZOOM_STEP))}
        >
          <Minus />
        </Button>
        <span className="min-w-12 text-center font-mono text-xs text-muted-foreground">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Zoom in"
          onClick={() => setScale((value) => clampScale(value + ZOOM_STEP))}
        >
          <Plus />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          aria-label="Fit to width"
          onClick={fitWidth}
        >
          <Maximize2 data-icon="inline-start" />
          Fit
        </Button>
      </div>

      <div ref={scrollRef} data-pdf-scroll className="min-h-0 flex-1 overflow-auto p-4">
        {document ? (
          <div className="flex flex-col items-center gap-4">
            {Array.from({ length: document.numPages }, (_, index) => (
              <PdfPage
                key={index + 1}
                document={document}
                pageNumber={index + 1}
                scale={scale}
                onSize={onPageSize}
              />
            ))}
          </div>
        ) : (
          <p className="pt-10 text-center text-sm text-muted-foreground">Opening the PDF…</p>
        )}
      </div>
    </div>
  );
}
