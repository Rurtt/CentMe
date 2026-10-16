"use client";

import { ViewTransition } from "react";
import { SummaryRow } from "@/components/common/SummaryRow";
import { useT } from "@/web/i18n/LanguageProvider";
import { FIXTURE, formatMinor, formatRate, type Estimate } from "@/web/money";
import { useCountUp } from "@/web/useCountUp";

const COUNT_MS = 250;

export function EstimateCard({ estimate }: { estimate: Estimate | null }) {
  const { t, lang } = useT();
  const net = useCountUp(estimate?.destinationNetMinor ?? "0", COUNT_MS, { startAtTarget: true });
  const fee = useCountUp(estimate?.feeMinor ?? "0", COUNT_MS, { startAtTarget: true });
  return (
    <aside aria-labelledby="estimate-title" className="rounded-2xl border bg-card p-6 shadow-sm lg:sticky lg:top-8">
      <div className="flex items-center justify-between gap-3">
        <h2 id="estimate-title" className="text-sm font-medium text-muted-foreground">{t("send.theyReceive")}</h2>
        <span className="rounded-full border border-dashed px-2 py-0.5 text-xs font-medium text-muted-foreground">{t("send.estimate")}</span>
      </div>
      <ViewTransition name="thb-amount" share="thb-morph" default="none">
        <p className="tabular mt-2 text-4xl font-semibold tracking-tight text-brand">
          {estimate ? formatMinor(net, "THB", lang) : "—"}
        </p>
      </ViewTransition>
      <dl className="mt-6 space-y-3 text-base">
        <SummaryRow label={t("send.fee")} value={estimate ? formatMinor(fee, "USD", lang) : "—"} />
        <SummaryRow label={t("send.rate")} value={formatRate(FIXTURE.rateNumerator.toString(), FIXTURE.rateDenominator.toString(), lang)} />
        <SummaryRow label={t("send.arrival")} value={t("send.arrivalTime")} />
      </dl>
    </aside>
  );
}
