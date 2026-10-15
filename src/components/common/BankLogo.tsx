import { Landmark } from "lucide-react";
import { bankByLabel } from "@/web/banks";
import { cn } from "@/web/utils";

/** Monogram badge in the bank's color. Decorative: the bank name is always shown as text next to it. */
export function BankLogo({ label, size = "md" }: { label: string; size?: "sm" | "md" }) {
  const bank = bankByLabel(label);
  const box = size === "sm" ? "size-6 rounded-md text-[9px]" : "size-10 rounded-lg text-xs";
  if (!bank) {
    return (
      <span aria-hidden className={cn("grid shrink-0 place-items-center bg-secondary text-brand", box)}>
        <Landmark className={size === "sm" ? "size-3.5" : "size-5"} />
      </span>
    );
  }
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center font-bold tracking-tight", box)}
      style={{ backgroundColor: bank.bg, color: bank.fg }}>
      {bank.short}
    </span>
  );
}
