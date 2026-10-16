"use client";

import { useState, type Ref } from "react";
import { useT } from "@/web/i18n/LanguageProvider";
import { cn } from "@/web/utils";

type Props = {
  value: string;
  onChange(value: string): void;
  onBlur(): void;
  errorText: string | null;
  inputRef: Ref<HTMLInputElement>;
  /** Bump on every failed submit/blur to replay the shake once. */
  shakeKey: number;
};

export function AmountField({ value, onChange, onBlur, errorText, inputRef, shakeKey }: Props) {
  const { t } = useT();
  // The class is dropped when the animation ends so the next bump re-adds it (no remount: focus stays).
  const [shookKey, setShookKey] = useState(0);
  const shaking = shakeKey > 0 && shakeKey !== shookKey;
  return (
    <div>
      <label htmlFor="amount" className="text-sm font-medium text-muted-foreground">
        {t("send.amountLabel")}
      </label>
      <div
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) setShookKey(shakeKey);
        }}
        className={cn(
          "mt-2 flex items-center rounded-xl border bg-background px-4 focus-within:ring-2 focus-within:ring-ring",
          errorText && "border-destructive",
          shaking && "animate-shake",
        )}
      >
        <span aria-hidden className="text-3xl font-semibold text-muted-foreground">$</span>
        <input
          id="amount"
          ref={inputRef}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={errorText ? true : undefined}
          aria-describedby={errorText ? "amount-error" : "amount-help"}
          className="tabular w-full min-w-0 bg-transparent px-2 py-4 text-4xl font-semibold outline-none"
        />
        <span className="text-base font-medium text-muted-foreground">USD</span>
      </div>
      {errorText ? (
        <p key={errorText} id="amount-error" role="alert" className="mt-2 animate-rise text-sm font-medium text-destructive">{errorText}</p>
      ) : (
        <p key="help" id="amount-help" className="mt-2 animate-rise text-sm text-muted-foreground">{t("send.amountHelp")}</p>
      )}
    </div>
  );
}
