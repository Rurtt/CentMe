"use client";

import { addTransitionType, startTransition, useEffect, useRef, useState, ViewTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { AmountField } from "@/components/send/AmountField";
import { EstimateCard } from "@/components/send/EstimateCard";
import { ChecksAlert, type ChecksBlock } from "@/components/send/ChecksAlert";
import { RecipientCard } from "@/components/send/RecipientCard";
import { ReviewStep } from "@/components/review/ReviewStep";
import { Button, LoadingLabel } from "@/components/ui/button";
import { useApi } from "@/web/api/ApiProvider";
import { isApiError } from "@/web/api/errors";
import type { Quote, Recipient } from "@/web/api/types";
import { readCheckScenario } from "@/web/demoScenario";
import { errorText } from "@/web/i18n/errorText";
import { useT } from "@/web/i18n/LanguageProvider";
import { estimateQuote, parseUsdInput, type ParseError } from "@/web/money";
import { pickRecipient, RECIPIENT_KEY } from "@/web/recipientChoice";
import { browserStorage } from "@/web/storage";

const AMOUNT_KEY = "centme:amount";

// Step slide direction; the matching CSS lives in globals.css (Send <-> Review motion).
const STEP_SLIDE = { "step-forward": "step-forward", "step-back": "step-back", default: "none" } as const;

export default function SendPage() {
  const { api, resetCount } = useApi();
  const { t } = useT();
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState("10.00");
  const [amountError, setAmountError] = useState<ParseError | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [recipientFailed, setRecipientFailed] = useState(false);
  // While the new-recipient form is open, a quote would go to the old recipient.
  const [editingRecipient, setEditingRecipient] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [checksBlock, setChecksBlock] = useState<ChecksBlock | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = browserStorage("session").getItem(AMOUNT_KEY);
    // Restore once after hydration (server render has no sessionStorage).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setAmount(saved);
  }, []);

  useEffect(() => {
    api.getRecipients()
      .then((list) => setRecipient(pickRecipient(list, browserStorage("session").getItem(RECIPIENT_KEY))))
      .catch(() => setRecipientFailed(true));
    // resetCount: a presenter Reset drops mock recipients, so the selection must be re-picked.
  }, [api, resetCount]);

  const parsed = parseUsdInput(amount);
  const estimate = parsed.ok ? estimateQuote(parsed.minor) : null;
  const fieldError = amountError ? t(`send.error.${amountError}` as const) : serverError;

  function onAmountChange(value: string) {
    setAmount(value);
    setAmountError(null);
    setServerError(null);
    setChecksBlock(null);
    browserStorage("session").setItem(AMOUNT_KEY, value);
  }

  function onRecipientChange(r: Recipient) {
    setRecipient(r);
    setQuote(null);
    setChecksBlock(null);
    setServerError(null);
    browserStorage("session").setItem(RECIPIENT_KEY, r.id);
  }

  function onAmountBlur() {
    if (amount.trim() !== "" && !parsed.ok) {
      setAmountError(parsed.error);
      setShakeKey((k) => k + 1);
    }
  }

  async function requestQuote(): Promise<boolean> {
    const p = parseUsdInput(amount);
    if (!p.ok) {
      setAmountError(p.error);
      setShakeKey((k) => k + 1);
      inputRef.current?.focus();
      return false;
    }
    if (!recipient || editingRecipient) return false;
    setQuoting(true);
    setChecksBlock(null);
    try {
      const check = readCheckScenario();
      setQuote(
        await api.createQuote({
          recipientId: recipient.id,
          sourceDebitMinor: p.minor,
          ...(check === "PASS" ? {} : { demoCheckScenario: check }),
        }),
      );
      return true;
    } catch (e) {
      if (isApiError(e, "CHECKS_REJECTED") || isApiError(e, "CHECKS_REVIEW_REQUIRED")) {
        // No quote exists. Drop any old one and show the alert on step 1 (also when called from "Get new quote").
        setQuote(null);
        setChecksBlock(e.code as ChecksBlock);
        setStep(1);
      } else if (isApiError(e, "INVALID_INPUT")) {
        setServerError(e.fieldErrors.sourceDebitMinor ?? e.message);
        setShakeKey((k) => k + 1);
        inputRef.current?.focus();
      } else {
        toast.error(errorText(e, t));
      }
      return false;
    } finally {
      setQuoting(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (await requestQuote()) {
      // A transition (not a plain setState) is what activates the ViewTransition below.
      startTransition(() => {
        addTransitionType("step-forward");
        setStep(2);
      });
    }
  }

  function backToForm() {
    startTransition(() => {
      addTransitionType("step-back");
      setStep(1);
    });
  }

  if (step === 2 && quote && recipient) {
    return (
      <ViewTransition key="review" enter={STEP_SLIDE} exit={STEP_SLIDE} default="none">
        <ReviewStep
          key={quote.id}
          quote={quote}
          recipient={recipient}
          onEdit={backToForm}
          onNewQuote={requestQuote}
          quoting={quoting}
        />
      </ViewTransition>
    );
  }

  return (
    <ViewTransition key="send" enter={STEP_SLIDE} exit={STEP_SLIDE} default="none">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <form onSubmit={onSubmit} aria-labelledby="send-title" className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8" noValidate>
          <h1 id="send-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("send.title")}</h1>
          <div className="mt-8 space-y-6">
            <AmountField value={amount} onChange={onAmountChange} onBlur={onAmountBlur} errorText={fieldError} inputRef={inputRef} shakeKey={shakeKey} />
            <RecipientCard recipient={recipient} failed={recipientFailed} onChange={onRecipientChange} onEditingChange={setEditingRecipient} />
          </div>
          {checksBlock && <ChecksAlert code={checksBlock} />}
          <Button type="submit" className="mt-8 h-12 w-full text-base font-semibold" disabled={quoting || !recipient || editingRecipient} aria-busy={quoting}>
            <LoadingLabel loading={quoting}>{t("send.continue")}</LoadingLabel>
          </Button>
        </form>
        <EstimateCard estimate={estimate} />
      </div>
    </ViewTransition>
  );
}
