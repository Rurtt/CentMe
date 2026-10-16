"use client";

import { useEffect, useRef, useState } from "react";
import { formatCountdown } from "@/web/format";
import { useT } from "@/web/i18n/LanguageProvider";
import { cn } from "@/web/utils";

const DEFAULT_TTL_MS = 300_000;
const WARN_MS = 60_000;
const URGENT_MS = 15_000;

type Props = { expiresAt: string; createdAt?: string; expired: boolean; onExpire(): void };

export function ExpiryCountdown({ expiresAt, createdAt, expired, onExpire }: Props) {
  const { t } = useT();
  const [remaining, setRemaining] = useState(() => Date.parse(expiresAt) - Date.now());
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (expired) return;
    const tick = () => {
      const ms = Date.parse(expiresAt) - Date.now();
      setRemaining(ms);
      if (ms <= 0) onExpireRef.current();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, expired]);

  if (expired) {
    return (
      <span role="status" className="shrink-0 animate-shake rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive">
        {t("review.expired")}
      </span>
    );
  }
  const ttl = createdAt ? Date.parse(expiresAt) - Date.parse(createdAt) : DEFAULT_TTL_MS;
  const total = ttl > 0 ? ttl : DEFAULT_TTL_MS;
  const left = Math.min(1, Math.max(0, remaining / total));
  return (
    <span
      role="timer"
      className={cn(
        "tabular inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors duration-300",
        remaining <= URGENT_MS
          ? "animate-throb bg-destructive/10 text-destructive"
          : remaining <= WARN_MS
            ? "bg-pending/10 text-pending-ink"
            : "bg-secondary text-brand",
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={3} aria-hidden className="size-[18px] shrink-0 -rotate-90">
        <circle cx="12" cy="12" r="10" pathLength={1} stroke="currentColor" strokeOpacity={0.2} />
        <circle
          cx="12"
          cy="12"
          r="10"
          pathLength={1}
          stroke="currentColor"
          strokeDasharray={1}
          strokeDashoffset={1 - left}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      {t("review.expiresIn", { time: formatCountdown(remaining) })}
    </span>
  );
}
