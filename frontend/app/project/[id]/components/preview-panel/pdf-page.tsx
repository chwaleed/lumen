"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";

type PdfPageProps = {
  document: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  onSize: (pageNumber: number, width: number, height: number) => void;
};

/**
 * One rendered page.
 *
 * Rendered only while near the viewport, and torn down once it is not: a
 * 62-page thesis at 2x device pixel ratio is well over a gigabyte of canvas if
 * every page is kept alive at once.
 *
 * The text layer is what makes text selectable and the browser's own Ctrl+F
 * work over the document, so there is no search box in our toolbar.
 */
export function PdfPage({ document: pdf, pageNumber, scale, onSize }: PdfPageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const [isNearViewport, setNearViewport] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  // Keep the placeholder the right shape before the page is rendered, so the
  // scrollbar does not jump as pages load in.
  useEffect(() => {
    let cancelled = false;
    void pdf.getPage(pageNumber).then((page: PDFPageProxy) => {
      if (cancelled) {
        return;
      }
      const viewport = page.getViewport({ scale });
      setSize({ width: viewport.width, height: viewport.height });
      onSize(pageNumber, viewport.width, viewport.height);
    });
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber, scale, onSize]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setNearViewport(entry?.isIntersecting ?? false),
      // A screen of slack either side, so scrolling meets rendered pages.
      { root: element.closest("[data-pdf-scroll]"), rootMargin: "100% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isNearViewport) {
      return;
    }

    let renderTask: RenderTask | null = null;
    let cancelled = false;

    void (async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) {
        return;
      }

      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const textLayerDiv = textLayerRef.current;
      if (!canvas || !textLayerDiv) {
        return;
      }

      // Render at device resolution and scale back down with CSS, or the text
      // is soft on any HiDPI screen.
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
        transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
      });

      try {
        await renderTask.promise;
      } catch {
        // Cancelled by a zoom change or by scrolling away. Not an error.
        return;
      }
      if (cancelled) {
        return;
      }

      textLayerDiv.replaceChildren();
      const { TextLayer } = await import("pdfjs-dist");
      const textLayer = new TextLayer({
        textContentSource: await page.getTextContent(),
        container: textLayerDiv,
        viewport,
      });
      await textLayer.render();
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber, scale, isNearViewport]);

  return (
    <div
      ref={containerRef}
      data-page={pageNumber}
      className="relative mx-auto bg-white shadow-sm"
      style={size ? { width: size.width, height: size.height } : undefined}
    >
      <canvas ref={canvasRef} className="block" />
      <div
        ref={textLayerRef}
        className="pdf-text-layer"
        // pdf.js positions every glyph against this, and reads it from CSS.
        style={{ ["--scale-factor" as string]: String(scale) }}
      />
    </div>
  );
}
