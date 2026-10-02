"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useProjectEditorHook } from "@/app/project/[id]/use-project-editor-hook";

const MOBILE_QUERY = "(max-width: 768px)";

// Wider containers can afford roomier panels before the editor starts to feel cramped.
const MIN_WIDTH_BREAKPOINTS = [
  { from: 1400, editor: 480, preview: 450 },
  { from: 1200, editor: 440, preview: 410 },
  { from: 1024, editor: 400, preview: 360 },
  { from: 0, editor: 340, preview: 300 },
];

export function usePanelSizing() {
  const initializeForViewport = useProjectEditorHook((state) => state.initializeForViewport);

  const [isMobile, setIsMobile] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const sync = () => {
      setIsMobile(media.matches);
      initializeForViewport(media.matches);
    };

    sync();
    media.addEventListener("change", sync);

    return () => {
      media.removeEventListener("change", sync);
    };
  }, [initializeForViewport]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(element);
    setContainerWidth(element.getBoundingClientRect().width);

    return () => {
      observer.disconnect();
    };
  }, []);

  const minWidths = useMemo(() => {
    const breakpoint =
      MIN_WIDTH_BREAKPOINTS.find(({ from }) => containerWidth >= from) ??
      MIN_WIDTH_BREAKPOINTS[MIN_WIDTH_BREAKPOINTS.length - 1];

    return { editor: breakpoint.editor, preview: breakpoint.preview };
  }, [containerWidth]);

  const maxWidths = useMemo(() => {
    if (containerWidth <= 0) {
      return { editor: undefined, preview: undefined } as const;
    }

    return {
      editor: Math.max(minWidths.editor, containerWidth - minWidths.preview),
      preview: Math.max(minWidths.preview, containerWidth - minWidths.editor),
    } as const;
  }, [containerWidth, minWidths.editor, minWidths.preview]);

  return { isMobile, containerRef, minWidths, maxWidths };
}
