"use client";

import { useEffect, useRef, useState } from "react";
import { interpolateMinor } from "./money";

/**
 * Counts from the value currently shown to `target`. Starts at "0" (so it counts up on mount)
 * unless `startAtTarget` is set, which shows the first target immediately and only animates changes.
 */
export function useCountUp(target: string, durationMs = 700, { startAtTarget = false } = {}): string {
  const [value, setValue] = useState(startAtTarget ? target : "0");
  const shown = useRef(value);

  useEffect(() => {
    const from = shown.current;
    if (from === target) return;
    // Reduced motion: the first frame jumps straight to the target.
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = instant ? 1 : Math.min(1, (now - start) / durationMs);
      shown.current = interpolateMinor(target, 1 - (1 - p) ** 3, from); // ease-out cubic
      setValue(shown.current);
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
