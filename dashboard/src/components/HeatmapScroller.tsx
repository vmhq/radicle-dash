"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Wraps the heatmap SVG in a horizontal scroll container that auto-scrolls
 * to the **right edge** on mount. Important because the grid is dated
 * oldest-on-the-left, newest-on-the-right; users expect to see today first.
 */
export function HeatmapScroller({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
  }, []);
  return (
    <div ref={ref} className="mt-5 overflow-x-auto">
      {children}
    </div>
  );
}
