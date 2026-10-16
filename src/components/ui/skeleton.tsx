import type { CSSProperties } from "react";
import { cn } from "@/web/utils";

export function Skeleton({ className, style, delayMs }: { className?: string; style?: CSSProperties; delayMs?: number }) {
  return (
    <div
      aria-hidden
      className={cn("skeleton", className)}
      style={delayMs === undefined ? style : ({ ...style, "--skeleton-delay": `${delayMs}ms` } as CSSProperties)}
    />
  );
}
