"use client";

import { CreditCard, Loader2, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/web/i18n/LanguageProvider";
import { cn } from "@/web/utils";
import type { PaySource } from "@/web/wallet";

type Props = {
  open: boolean;
  onOpenChange(open: boolean): void;
  amountText: string;
  balanceText: string;
  walletEnough: boolean;
  source: PaySource;
  onSourceChange(source: PaySource): void;
  paying: boolean;
  onConfirm(): void;
};

export function BankSheet({ open, onOpenChange, amountText, balanceText, walletEnough, source, onSourceChange, paying, onConfirm }: Props) {
  const { t } = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card sm:max-w-md" showCloseButton={!paying}>
        <DialogHeader>
          <DialogTitle>{t("sheet.title")}</DialogTitle>
          <DialogDescription>{t("sheet.desc")}</DialogDescription>
        </DialogHeader>
        <p className="tabular text-3xl font-semibold">{amountText}</p>
        {/* Native radios: arrow keys and screen readers work without extra code. */}
        <div role="radiogroup" aria-label={t("sheet.title")} className="space-y-2">
          <SourceOption value="CARD" checked={source === "CARD"} onSelect={onSourceChange} disabled={paying}
            icon={<CreditCard className="size-5 text-brand" aria-hidden />} title={t("sheet.card")} />
          <SourceOption value="WALLET" checked={source === "WALLET"} onSelect={onSourceChange} disabled={paying || !walletEnough}
            icon={<Wallet className="size-5 text-brand" aria-hidden />} title={t("sheet.wallet")}
            detail={walletEnough ? t("sheet.balance", { amount: balanceText }) : `${t("sheet.balance", { amount: balanceText })} · ${t("sheet.lowBalance")}`}
            warn={!walletEnough} />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={paying}>
            {t("sheet.cancel")}
          </Button>
          <Button className="h-12 text-base font-semibold" onClick={onConfirm} disabled={paying} autoFocus>
            {paying && <Loader2 className="animate-spin" aria-hidden />}
            {t("sheet.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SourceOption(props: {
  value: PaySource; checked: boolean; disabled: boolean; onSelect(v: PaySource): void;
  icon: ReactNode; title: string; detail?: string; warn?: boolean;
}) {
  return (
    <label className={cn(
      "flex cursor-pointer items-center gap-3 rounded-xl border bg-background p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
      props.checked && "border-brand ring-1 ring-brand",
      props.disabled && !props.checked && "cursor-not-allowed opacity-60",
    )}>
      <input type="radio" name="pay-source" value={props.value} checked={props.checked} disabled={props.disabled}
        onChange={() => props.onSelect(props.value)} className="size-4 accent-[var(--brand)]" />
      {props.icon}
      <span className="flex-1">
        <span className="block font-medium">{props.title}</span>
        {props.detail && (
          <span className={cn("tabular block text-sm", props.warn ? "text-destructive" : "text-muted-foreground")}>{props.detail}</span>
        )}
      </span>
    </label>
  );
}
