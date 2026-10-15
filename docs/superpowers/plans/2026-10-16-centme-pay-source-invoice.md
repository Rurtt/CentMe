# CentMe bank logos, pay source, invoice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bank logo badges, a 12-digit account cap, a card-or-wallet choice in the bank sheet, and a printable invoice on the receipt. Frontend only.

**Architecture:** Two new pure modules (`src/web/banks.ts`, `src/web/wallet.ts`) hold the logic and are unit-tested. Components read them. The wallet is a fake USD balance in `sessionStorage`; funding still calls the same simulated endpoint, and the wallet is debited only after funding comes back `ACCEPTED`, once per transfer. Print uses `window.print()` and a `@media print` block that shows only `#invoice`.

**Tech Stack:** Next 16, React, TypeScript, Tailwind v4, `radix-ui` (already a dependency), lucide-react, vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-16-centme-pay-source-invoice-design.md` (U-Hackathon repo).

All code paths below are in `D:\U-hackathon_backend`. Run commands from that folder.

## Global Constraints

- Frontend only. Do not touch `src/app/api/`, `src/server/`, `src/db/`, `src/domain/`, `src/lib/`, `src/settlement/`, `db/`.
- Bank labels must equal `THAI_BANKS` labels in `src/domain/recipients.ts`: `Kasikorn Bank`, `SCB`, `Bangkok Bank`, `Krungthai`, `Krungsri`, `ttb`, `GSB`.
- Account input: digits only, max 12. Validation stays 10-12 (`newRecipientBody`).
- Wallet start balance `"5000"` minor units = $50.00. Keys: `centme:walletMinor`, `centme:paySource:<transferId>`, `centme:walletDebited:<transferId>`, `centme:walletTransfers` (approved reset-cleanup index), all in `sessionStorage` via `browserStorage("session")`.
- Card label `Visa ••4821`, invoice number `INV-<receipt id>`: same text in EN and TH.
- No emoji icons. Lucide only. Badges are `aria-hidden`; the bank name stays visible text.
- Every new EN key has a TH key (parity test in `tests/web/i18n/translate.test.ts`).
- No new labels saying "simulated"; the footer line covers it.

## Review Focus

- Refreshing the transfer page after a wallet payment must not debit twice. Covered by the `debitForTransfer` once-only test (Task 3).
- A declined funding (presenter `FUNDING_DECLINED`) must not debit. Covered: `TrackView` debits only on `funding.status === "ACCEPTED"`; walkthrough step in Task 5.
- Pasting `123-456-7890` or `12 3456 7890 123` into the account field. Covered by `sanitizeAccountInput` tests (Task 2).
- Wallet balance exactly equal to the amount must be allowed ($50.00 with $50.00 balance). Covered by `canPayFromWallet` test (Task 3).
- Receipt opened in another browser (no stored source) must not show an empty "Paid from" row. Covered by `getPaySource` returning `null` and Receipt hiding the row (Tasks 3, 4).

---

### Task 0: Preflight

The backend repo had **10 uncommitted files** on `feat/ui-polish-recipient` when this plan was written (`src/app/page.tsx`, `RecipientCard.tsx`, `src/domain/recipients.ts`, `ApiProvider.tsx`, `mock.ts`, `en.ts`, `th.ts`, and 3 tests). They are not part of this plan.

- [x] **Step 1:** Run `git status --short`. If any changes are still there, **stop and ask Pong** whether to commit them on `feat/ui-polish-recipient` first. Do not stash, reset, or discard them.
- [x] **Step 2:** After the tree is clean: `git switch -c feat/pay-source-invoice`.
- [x] **Step 3:** Baseline: `pnpm test` and `pnpm typecheck`. Both must pass before you start. If they fail, report and stop.

---

### Task 1: Bank table and logo badge

**Files:**
- Create: `src/web/banks.ts`
- Create: `src/components/common/BankLogo.tsx`
- Modify: `src/components/send/RecipientCard.tsx` (avatar span)
- Test: `tests/web/banks.test.ts`

**Interfaces:**
- Produces: `type BankBrand = { code: BankCode; label: string; short: string; bg: string; fg: string }`, `BANK_BRANDS: readonly BankBrand[]`, `bankByLabel(label: string): BankBrand | undefined`, `bankByCode(code: BankCode): BankBrand`. Component `<BankLogo label={string} size="sm" | "md" />` (sm = 24px, md = 40px; default md).

- [x] **Step 1: Write the failing test** `tests/web/banks.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { THAI_BANKS } from "@/domain/recipients";
import { BANK_BRANDS, bankByCode, bankByLabel } from "@/web/banks";

describe("banks", () => {
  it("has one brand per server bank, with the same label", () => {
    expect(BANK_BRANDS.map((b) => [b.code, b.label])).toEqual(THAI_BANKS.map((b) => [b.code, b.label]));
  });
  it("finds a bank by the label the server sends", () => {
    expect(bankByLabel("Bangkok Bank")?.short).toBe("BBL");
    expect(bankByCode("SCB").label).toBe("SCB");
  });
  it("returns undefined for the seeded demo bank", () => {
    expect(bankByLabel("Demo Thai Bank")).toBeUndefined();
  });
});
```

- [x] **Step 2:** `pnpm vitest run tests/web/banks.test.ts` — expect FAIL (cannot resolve `@/web/banks`).

- [x] **Step 3: Implement** `src/web/banks.ts`

```ts
import { THAI_BANKS, type BankCode } from "@/domain/recipients";

export type BankBrand = { code: BankCode; label: string; short: string; bg: string; fg: string };

// Monogram colors close to each bank's brand. Text color picked for contrast on the fill.
const STYLE: Record<BankCode, { short: string; bg: string; fg: string }> = {
  KBANK: { short: "K", bg: "#138F2D", fg: "#FFFFFF" },
  SCB: { short: "SCB", bg: "#4E2E7F", fg: "#FFFFFF" },
  BBL: { short: "BBL", bg: "#1E4598", fg: "#FFFFFF" },
  KTB: { short: "KTB", bg: "#1BA5E1", fg: "#0B2E4F" },
  BAY: { short: "BAY", bg: "#FEC43B", fg: "#4A3B2F" },
  TTB: { short: "ttb", bg: "#0050F0", fg: "#FFFFFF" },
  GSB: { short: "GSB", bg: "#EB198D", fg: "#FFFFFF" },
};

export const BANK_BRANDS: readonly BankBrand[] = THAI_BANKS.map((b) => ({ code: b.code, label: b.label, ...STYLE[b.code] }));

export function bankByCode(code: BankCode): BankBrand {
  return BANK_BRANDS.find((b) => b.code === code)!;
}

/** Recipients only carry `bankLabel`; unknown labels (the seeded demo bank) return undefined. */
export function bankByLabel(label: string): BankBrand | undefined {
  return BANK_BRANDS.find((b) => b.label === label);
}
```

- [x] **Step 4:** `pnpm vitest run tests/web/banks.test.ts` — expect PASS.

- [x] **Step 5: Badge component** `src/components/common/BankLogo.tsx`

```tsx
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
```

- [x] **Step 6: RecipientCard.** In `src/components/send/RecipientCard.tsx` replace the initials avatar span:

```tsx
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary font-semibold text-brand">
            {recipient ? initials(recipient.name) : ""}
          </span>
```

with:

```tsx
          {recipient ? (
            <BankLogo label={recipient.bankLabel} />
          ) : (
            <span aria-hidden className="size-10 shrink-0 rounded-lg bg-secondary" />
          )}
```

Add `import { BankLogo } from "@/components/common/BankLogo";`. Remove `initials` from the `@/web/format` import if nothing else in the file uses it.

- [x] **Step 7:** `pnpm typecheck && pnpm lint && pnpm test` — all pass.

- [x] **Step 8: Commit**

```bash
git add src/web/banks.ts src/components/common/BankLogo.tsx src/components/send/RecipientCard.tsx tests/web/banks.test.ts
git commit -m "feat(web): bank monogram badges on the recipient card"
```

---

### Task 2: Account cap and bank picker with badges

**Files:**
- Modify: `src/web/format.ts` (add `sanitizeAccountInput`)
- Create: `src/components/ui/select.tsx`
- Modify: `src/components/send/RecipientForm.tsx`
- Test: `tests/web/format.test.ts` (append)

**Interfaces:**
- Consumes: `BANK_BRANDS` from Task 1 (`src/web/banks.ts`), `<BankLogo label size="sm" />`.
- Produces: `sanitizeAccountInput(raw: string): string`; `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` from `@/components/ui/select`.

- [x] **Step 1: Write the failing test.** Append to `tests/web/format.test.ts` (add `sanitizeAccountInput` to its existing `@/web/format` import):

```ts
describe("sanitizeAccountInput", () => {
  it("keeps digits only", () => {
    expect(sanitizeAccountInput("123-456-7890")).toBe("1234567890");
    expect(sanitizeAccountInput("12a 34")).toBe("1234");
  });
  it("stops at 12 digits", () => {
    expect(sanitizeAccountInput("12 3456 7890 123")).toBe("123456789012");
    expect(sanitizeAccountInput("1".repeat(20))).toHaveLength(12);
  });
  it("handles empty input", () => {
    expect(sanitizeAccountInput("")).toBe("");
  });
});
```

- [x] **Step 2:** `pnpm vitest run tests/web/format.test.ts` — expect FAIL (`sanitizeAccountInput` is not exported).

- [x] **Step 3: Implement.** Append to `src/web/format.ts`:

```ts
/** Account field: digits only, at most 12, so pasting "123-456-7890" works and a 13th digit does nothing. */
export function sanitizeAccountInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 12);
}
```

- [x] **Step 4:** `pnpm vitest run tests/web/format.test.ts` — expect PASS.

- [x] **Step 5: Select primitive** `src/components/ui/select.tsx`

```tsx
"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { cn } from "@/web/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger className={cn("flex items-center justify-between gap-2 text-left", className)} {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={4}
        className={cn("z-50 max-h-72 w-(--radix-select-trigger-width) overflow-hidden rounded-lg border bg-card shadow-md", className)}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex cursor-default select-none items-center rounded-md py-2 pl-2 pr-8 text-base outline-none data-[highlighted]:bg-secondary data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2">
        <Check className="size-4" aria-hidden />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
```

- [x] **Step 6: RecipientForm.** In `src/components/send/RecipientForm.tsx`:

  a. Imports: add

```tsx
import { BankLogo } from "@/components/common/BankLogo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BANK_BRANDS } from "@/web/banks";
import { sanitizeAccountInput } from "@/web/format";
```

  and change `import { newRecipientBody, THAI_BANKS, type BankCode } from "@/domain/recipients";` to `import { newRecipientBody, type BankCode } from "@/domain/recipients";`.

  b. The bank ref is now the trigger button: `bankCode: useRef<HTMLButtonElement>(null)`.

  c. Replace the whole `<select id="rcp-bank" ...>...</select>` element with:

```tsx
          <Select value={bankCode} onValueChange={(v) => { setBankCode(v as BankCode); setErrors((x) => ({ ...x, bankCode: undefined })); }}>
            <SelectTrigger id="rcp-bank" ref={refs.bankCode}
              aria-invalid={!!errors.bankCode} aria-describedby={errors.bankCode ? "rcp-bankCode-error" : undefined}
              className={inputClass(!!errors.bankCode)}>
              <SelectValue placeholder={t("recipient.bankPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {BANK_BRANDS.map((b) => (
                <SelectItem key={b.code} value={b.code}>
                  <span className="flex items-center gap-2">
                    <BankLogo label={b.label} size="sm" />
                    {b.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
```

  d. Account input: change `maxLength={20}` to `maxLength={12}` and its onChange to

```tsx
            onChange={(e) => { setAccountNumber(sanitizeAccountInput(e.target.value)); setErrors((x) => ({ ...x, accountNumber: undefined })); }}
```

  e. The Enter-to-save handler only fires for `INPUT` targets, so pressing Enter on the closed bank trigger opens the list instead of saving. That is the wanted behaviour; leave it.

- [x] **Step 7:** `pnpm typecheck && pnpm lint && pnpm test` — all pass.

- [x] **Step 8: Manual check** (`pnpm dev`, open `http://localhost:3000`): Change recipient, Tab to the bank picker, press Space, arrow to SCB, Enter. The trigger shows the SCB badge + "SCB". Type 15 digits: only 12 appear. Save with no bank picked: error under the bank field and focus lands on the trigger.

- [x] **Step 9: Commit**

```bash
git add src/web/format.ts src/components/ui/select.tsx src/components/send/RecipientForm.tsx tests/web/format.test.ts
git commit -m "feat(web): bank picker with logos and a 12-digit account cap"
```

---

### Task 3: Card or wallet

**Files:**
- Create: `src/web/wallet.ts`
- Modify: `src/components/review/BankSheet.tsx`
- Modify: `src/components/review/ReviewStep.tsx`
- Modify: `src/components/track/TrackView.tsx` (`runFunding`)
- Modify: `src/components/demo/PresenterPanel.tsx` (reset button)
- Modify: `src/web/i18n/en.ts`, `src/web/i18n/th.ts`
- Test: `tests/web/wallet.test.ts`

**Interfaces:**
- Produces (all take an optional last `store: KeyValueStore = browserStorage("session")`):
  - `type PaySource = "CARD" | "WALLET"`
  - `getBalanceMinor(store?): bigint`
  - `canPayFromWallet(amountMinor: string, store?): boolean`
  - `setPaySource(transferId: string, source: PaySource, store?): void`
  - `getPaySource(transferId: string, store?): PaySource | null`
  - `debitForTransfer(transferId: string, amountMinor: string, store?): void` — debits only if the stored source is `WALLET`, and only once per transfer.
  - `resetWallet(store?): void`

- [x] **Step 1: Write the failing test** `tests/web/wallet.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { markDrifted } from "@/web/api/drift";
import { snapshotWith } from "@/web/api/fixtures";
import { memoryStore } from "@/web/storage";
import { canPayFromWallet, reconcileFunding, debitForTransfer, getBalanceMinor, getPaySource, resetWallet, setPaySource } from "@/web/wallet";

describe("wallet", () => {
  it("starts at $50.00", () => {
    expect(getBalanceMinor(memoryStore())).toBe(5000n);
  });
  it("allows paying exactly the balance, not more", () => {
    const s = memoryStore();
    expect(canPayFromWallet("5000", s)).toBe(true);
    expect(canPayFromWallet("5001", s)).toBe(false);
  });
  it("debits a wallet transfer once, even if called again after a refresh", () => {
    const s = memoryStore();
    setPaySource("trf_1", "WALLET", s);
    debitForTransfer("trf_1", "1000", s);
    debitForTransfer("trf_1", "1000", s);
    expect(getBalanceMinor(s)).toBe(4000n);
  });
  it("never debits a card transfer or one with no stored source", () => {
    const s = memoryStore();
    setPaySource("trf_card", "CARD", s);
    debitForTransfer("trf_card", "1000", s);
    debitForTransfer("trf_unknown", "1000", s);
    expect(getBalanceMinor(s)).toBe(5000n);
  });
  it("remembers the source per transfer and returns null when missing", () => {
    const s = memoryStore();
    setPaySource("trf_1", "WALLET", s);
    expect(getPaySource("trf_1", s)).toBe("WALLET");
    expect(getPaySource("trf_2", s)).toBeNull();
  });
  it("treats a corrupt stored balance as the start balance", () => {
    const s = memoryStore();
    s.setItem("centme:walletMinor", "abc");
    expect(getBalanceMinor(s)).toBe(5000n);
  });
  it("reset restores $50.00", () => {
    const s = memoryStore();
    setPaySource("trf_1", "WALLET", s);
    debitForTransfer("trf_1", "1000", s);
    resetWallet(s);
    expect(getBalanceMinor(s)).toBe(5000n);
  });
});

describe("wallet after presenter reset", () => {
  it("debits a new transfer when mock reset reuses a transfer id", () => {
    const s = memoryStore();
    setPaySource("trf_1", "WALLET", s);
    debitForTransfer("trf_1", "1000", s);
    resetWallet(s);
    setPaySource("trf_1", "WALLET", s);
    debitForTransfer("trf_1", "1000", s);
    expect(getBalanceMinor(s)).toBe(4000n);
  });
});

it("reset clears tracked sources and debit records, preserving unrelated storage", () => {
  const s = memoryStore();
  s.setItem("centme:scenario", "HAPPY_PATH");
  setPaySource("wallet", "WALLET", s);
  setPaySource("card", "CARD", s);
  debitForTransfer("wallet", "1000", s);
  resetWallet(s);
  expect(getPaySource("wallet", s)).toBeNull();
  expect(getPaySource("card", s)).toBeNull();
  expect(s.getItem("centme:walletDebited:wallet")).toBeNull();
  expect(s.getItem("centme:scenario")).toBe("HAPPY_PATH");
});

it("recovers an accepted wallet debit from a fetched snapshot once", () => {
  const s = memoryStore();
  const accepted = snapshotWith({ status: "COMPLETED_SIMULATED", funding: { status: "ACCEPTED" } });
  setPaySource(accepted.id, "WALLET", s);
  reconcileFunding(accepted, s);
  reconcileFunding(accepted, s);
  expect(getBalanceMinor(s)).toBe(4000n);
});

it("never reconciles a debit from declined or pending funding", () => {
  const s = memoryStore();
  const pending = snapshotWith({ status: "FUNDING_PENDING", funding: { status: "PENDING" } });
  setPaySource(pending.id, "WALLET", s);
  reconcileFunding(pending, s);
  reconcileFunding(snapshotWith({ status: "FUNDING_FAILED", funding: { status: "DECLINED" } }), s);
  expect(getBalanceMinor(s)).toBe(5000n);
});

it("never debits a snapshot rejected by contract validation", () => {
  const s = memoryStore();
  const invalid = markDrifted(snapshotWith({ status: "COMPLETED_SIMULATED", funding: { status: "ACCEPTED" } }));
  setPaySource(invalid.id, "WALLET", s);
  reconcileFunding(invalid, s);
  expect(getBalanceMinor(s)).toBe(5000n);
});
```

- [x] **Step 2:** `pnpm vitest run tests/web/wallet.test.ts` — expect FAIL (cannot resolve `@/web/wallet`).

- [x] **Step 3: Implement** `src/web/wallet.ts`

```ts
import { isDrifted } from "./api/drift";
import type { TransferSnapshot } from "./api/types";
import { browserStorage, type KeyValueStore } from "./storage";

/** Fake CentMe wallet for the demo. Lives in sessionStorage; the server never knows about it. */
export type PaySource = "CARD" | "WALLET";

const BALANCE_KEY = "centme:walletMinor";
const TRANSFERS_KEY = "centme:walletTransfers";
const START_MINOR = 5000n; // $50.00
const sourceKey = (id: string) => `centme:paySource:${id}`;
const debitedKey = (id: string) => `centme:walletDebited:${id}`;
const session = () => browserStorage("session");


/** Track keys because KeyValueStore deliberately has no storage-wide enumeration. */
function trackedTransfers(store: KeyValueStore): string[] {
  try {
    const ids: unknown = JSON.parse(store.getItem(TRANSFERS_KEY) ?? "[]");
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}
export function getBalanceMinor(store: KeyValueStore = session()): bigint {
  const raw = store.getItem(BALANCE_KEY);
  return raw !== null && /^\d+$/.test(raw) ? BigInt(raw) : START_MINOR;
}

export function canPayFromWallet(amountMinor: string, store: KeyValueStore = session()): boolean {
  return BigInt(amountMinor) <= getBalanceMinor(store);
}

export function setPaySource(transferId: string, source: PaySource, store: KeyValueStore = session()): void {
  const ids = trackedTransfers(store);
  if (!ids.includes(transferId)) store.setItem(TRANSFERS_KEY, JSON.stringify([...ids, transferId]));
  store.setItem(sourceKey(transferId), source);
}

export function getPaySource(transferId: string, store: KeyValueStore = session()): PaySource | null {
  const v = store.getItem(sourceKey(transferId));
  return v === "CARD" || v === "WALLET" ? v : null;
}

/** Called after funding is accepted. A refresh replays funding, so the debit is marked per transfer. */
export function debitForTransfer(transferId: string, amountMinor: string, store: KeyValueStore = session()): void {
  if (getPaySource(transferId, store) !== "WALLET" || store.getItem(debitedKey(transferId))) return;
  const next = getBalanceMinor(store) - BigInt(amountMinor);
  store.setItem(BALANCE_KEY, String(next < 0n ? 0n : next));
  store.setItem(debitedKey(transferId), "1");
}

/** Recover accepted funding after a lost response; once-only markers also cover polling and refresh. */
export function reconcileFunding(snapshot: TransferSnapshot, store: KeyValueStore = session()): void {
  if (!isDrifted(snapshot) && snapshot.funding.status === "ACCEPTED") {
    debitForTransfer(snapshot.id, snapshot.amounts.sourceDebitMinor, store);
  }
}
export function resetWallet(store: KeyValueStore = session()): void {
  for (const id of trackedTransfers(store)) {
    store.removeItem(sourceKey(id));
    store.removeItem(debitedKey(id));
  }
  store.removeItem(TRANSFERS_KEY);
  store.removeItem(BALANCE_KEY);
}
```

- [x] **Step 4:** `pnpm vitest run tests/web/wallet.test.ts` — expect PASS.

- [x] **Step 5: i18n.** In `src/web/i18n/en.ts` replace the `sheet.*` block with:

```ts
  "sheet.title": "Choose how to pay",
  "sheet.desc": "Check the amount, then confirm.",
  "sheet.card": "Visa ••4821",
  "sheet.wallet": "CentMe wallet",
  "sheet.balance": "Balance {amount}",
  "sheet.lowBalance": "Not enough balance",
  "sheet.confirm": "Confirm payment",
  "sheet.cancel": "Cancel",
```

In `src/web/i18n/th.ts` replace its `sheet.*` block with (keep the existing TH `sheet.desc`, `sheet.confirm`, `sheet.cancel` values as they are; only `sheet.from` and `sheet.account` go away):

```ts
  "sheet.title": "เลือกวิธีชำระเงิน",
  "sheet.card": "Visa ••4821",
  "sheet.wallet": "กระเป๋าเงิน CentMe",
  "sheet.balance": "ยอดคงเหลือ {amount}",
  "sheet.lowBalance": "ยอดเงินไม่พอ",
```

Then `grep -rn "sheet.from\|sheet.account" src` must return nothing.

- [x] **Step 6: BankSheet.** Replace `src/components/review/BankSheet.tsx` with:

```tsx
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
```

If `--brand` is not the CSS variable name in `src/app/globals.css`, use the variable the `text-brand` utility maps to.

- [x] **Step 7: ReviewStep.** In `src/components/review/ReviewStep.tsx`:

  a. Import: `import { canPayFromWallet, getBalanceMinor, setPaySource, type PaySource } from "@/web/wallet";`

  b. State, next to `sheetOpen`:

```tsx
  const [source, setSource] = useState<PaySource>("CARD");
  const [balanceMinor, setBalanceMinor] = useState(() => getBalanceMinor());
```

  c. The Pay button `onClick={() => setSheetOpen(true)}` becomes (re-read the balance; another tab or a reset may have changed it):

```tsx
onClick={() => { setBalanceMinor(getBalanceMinor()); setSource("CARD"); setSheetOpen(true); }}
```

  d. In `confirm()`, right after `const transfer = await api.createTransfer(...)` and before `router.replace(...)`:

```tsx
      setPaySource(transfer.id, source);
```

  e. Pass the new props to `<BankSheet>`:

```tsx
        balanceText={formatMinor(String(balanceMinor), "USD", lang)}
        walletEnough={canPayFromWallet(quote.sourceDebitMinor)}
        source={source}
        onSourceChange={setSource}
```

- [x] **Step 8: TrackView.** In `src/components/track/TrackView.tsx` `runFunding`, replace

```tsx
      accept(await api.simulateFunding(id, getOrCreateKey(`funding:${id}`)));
```

with

```tsx
      const funded = await api.simulateFunding(id, getOrCreateKey(`funding:${id}`));
      // Declined funding moves no money, so the wallet is only debited on ACCEPTED (once per transfer).
      reconcileFunding(funded);
      accept(funded);
```

and add `import { reconcileFunding } from "@/web/wallet";`. Also reconcile fetched snapshots in a `useEffect` keyed by `snapshot` to recover accepted funding after a lost response; contract-drift snapshots are ignored by the helper.

- [x] **Step 9: Presenter reset.** In `src/components/demo/PresenterPanel.tsx`, the reset button's onClick becomes

```tsx
        onClick={() => {
          resetMock();
          resetWallet();
          router.push("/");
        }}
```

with `import { resetWallet } from "@/web/wallet";`.

- [x] **Step 10:** `pnpm typecheck && pnpm lint && pnpm test` — all pass (i18n parity included).

- [x] **Step 11: Manual check** (`pnpm dev`): Pay $10 with the wallet; the sheet showed "Balance $50.00". Send another $10 by wallet: the sheet shows $40.00. Set the amount to $45: the wallet radio is disabled and says "Balance $30.00 · Not enough balance" in red. Refresh a finished wallet transfer page: the balance does not drop again. Presenter `FUNDING_DECLINED` + wallet: balance unchanged. Presenter reset: balance back to $50.00.

- [x] **Step 12: Commit**

```bash
git add src/web/wallet.ts src/components/review/BankSheet.tsx src/components/review/ReviewStep.tsx src/components/track/TrackView.tsx src/components/demo/PresenterPanel.tsx src/web/i18n/en.ts src/web/i18n/th.ts tests/web/wallet.test.ts
git commit -m "feat(web): pay by card or CentMe wallet in the bank sheet"
```

---

### Task 4: Printable invoice

**Files:**
- Modify: `src/components/track/Receipt.tsx`
- Modify: `src/app/globals.css` (append a print block)
- Modify: `src/web/i18n/en.ts`, `src/web/i18n/th.ts`

**Interfaces:**
- Consumes: `getPaySource(transferId): PaySource | null` (Task 3), `Logo` from `@/components/brand/Logo` (exists; check its props before use).

- [x] **Step 1: i18n.** Add to `en.ts` (receipt block):

```ts
  "receipt.invoiceNo": "Invoice no.",
  "receipt.sender": "Sender",
  "receipt.senderName": "CentMe demo sender",
  "receipt.paidFrom": "Paid from",
  "action.PRINT": "Print / Save PDF",
```

and `th.ts`:

```ts
  "receipt.invoiceNo": "เลขที่เอกสาร",
  "receipt.sender": "ผู้ส่ง",
  "receipt.senderName": "ผู้ส่งเดโม CentMe",
  "receipt.paidFrom": "ชำระจาก",
  "action.PRINT": "พิมพ์ / บันทึก PDF",
```

- [x] **Step 2: Receipt.** In `src/components/track/Receipt.tsx`:

  a. Imports: add `Printer` to the lucide import; add `import { useState } from "react";`, `import { Logo } from "@/components/brand/Logo";`, `import { getPaySource } from "@/web/wallet";`.

  b. After `const received = useCountUp(...)`: `const [paidFrom] = useState(() => getPaySource(s.id));` (hooks stay above the `if (!s.receipt) return null`).

  c. `<section aria-labelledby="receipt-title" ...>` gets `id="invoice"`.

  d. First child inside the section, before the check-icon row:

```tsx
      <div className="mb-6 hidden print:block"><Logo /></div>
```

  e. Replace the header row `<div className="flex items-center gap-3">...</div>` with:

```tsx
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-primary print:hidden">
            <Check className="size-5 text-foreground" aria-hidden />
          </span>
          <h2 id="receipt-title" className="text-lg font-semibold">{t("receipt.title")}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("receipt.invoiceNo")} <code className="font-mono text-foreground">INV-{s.receipt.id}</code>
        </p>
      </div>
```

  f. In the `<dl>`, insert before the `receipt.recipient` row:

```tsx
        <SummaryRow label={t("receipt.sender")} value={t("receipt.senderName")} />
```

  and after the `receipt.recipient` row:

```tsx
        {paidFrom && (
          <SummaryRow label={t("receipt.paidFrom")} value={paidFrom === "WALLET" ? t("sheet.wallet") : t("sheet.card")} />
        )}
```

  g. In the tx hash value, after the Snowtrace `<a>`, add the URL as text for paper:

```tsx
                {s.settlement.explorerUrl && (
                  <span className="hidden break-all font-mono text-xs print:block">{s.settlement.explorerUrl}</span>
                )}
```

  h. Actions row: add `print:hidden` to its className, and a third button after Copy link:

```tsx
        <Button variant="outline" className="h-12 flex-1 text-base" onClick={() => window.print()}>
          <Printer aria-hidden />
          {t("action.PRINT")}
        </Button>
```

- [x] **Step 3: Print CSS.** Append to `src/app/globals.css`:

```css
/* Print / Save PDF: only the receipt (#invoice) goes on paper. */
@media print {
  @page { margin: 16mm; }
  body { background: #fff !important; }
  body * { visibility: hidden; }
  #invoice, #invoice * { visibility: visible; }
  #invoice {
    position: absolute; inset: 0 auto auto 0; width: 100%;
    border: 0 !important; box-shadow: none !important; padding: 0 !important;
    color: #000 !important; animation: none !important;
  }
  #invoice .text-muted-foreground { color: #333 !important; }
}
```

- [x] **Step 4:** `pnpm typecheck && pnpm lint && pnpm test` — all pass.

- [x] **Step 5: Manual check:** finish a transfer, click Print / Save PDF. The preview is one page: logo, Receipt + invoice no., amounts, fee, rate, sender, recipient, paid from, references, tx hash + full Snowtrace URL, IDs. No header, footer, timeline, Details, buttons, toasts, or presenter panel. Repeat in TH.

- [x] **Step 6: Commit**

```bash
git add src/components/track/Receipt.tsx src/app/globals.css src/web/i18n/en.ts src/web/i18n/th.ts
git commit -m "feat(web): printable invoice on the receipt"
```

---

### Task 5: Walkthrough and wrap-up

- [x] **Step 1:** `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — all pass. Paste the summary lines in the report.
- [x] **Step 2: Browser walkthrough** (mock mode; 1280px and 375px; EN and TH), from the spec's Testing section:
  - Pick SCB using only the keyboard, badge on the card; 15 typed digits show as 12.
  - $10 by wallet: balance $40.00, receipt "Paid from: CentMe wallet".
  - $45 next: wallet disabled with "Not enough balance"; pay by card; receipt "Paid from: Visa ••4821".
  - Presenter `FUNDING_DECLINED` + wallet: balance unchanged.
  - Print preview: one clean page.
  - At 375px the sheet's two options and the receipt's three buttons stack with no horizontal scroll.
- [x] **Step 3:** Append results to `docs/superpowers/plans/2026-10-16-centme-pay-source-invoice.md` (U-Hackathon repo) under a `## Walkthrough results` heading and commit there: `docs: walkthrough results for pay source + invoice`.
- [ ] **Step 4:** Push `feat/pay-source-invoice` and open a PR into the branch `feat/ui-polish-recipient` targets, only after Pong says yes.

## Execution checkpoint — 2026-10-16 (historical; resolved below)

Implementation repo: `D:\U-hackathon_backend`, branch `feat/pay-source-invoice`, base `e071489` (`centme-main`). `feat/ui-polish-recipient` is already merged and its source contents match the base exactly. Baseline: 503 passed, 121 skipped; typecheck passed. Handoff committed in U-Hackathon as `6ca8d79`.

- Task 1: complete, commit `289038d`. Files: `src/web/banks.ts`, `src/components/common/BankLogo.tsx`, `src/components/send/RecipientCard.tsx`, `tests/web/banks.test.ts`. RED: missing banks module. GREEN: 3 bank tests; full suite 506 passed, 121 skipped; typecheck and lint passed.
- Task 2: complete, commit `471c1a2`. Files: `src/web/format.ts`, `src/components/ui/select.tsx`, `src/components/send/RecipientForm.tsx`, `tests/web/format.test.ts`. RED: three sanitizer failures. GREEN: 7 format tests; full suite 509 passed, 121 skipped; typecheck and lint passed. Browser at 1280px in EN: keyboard SCB selection and card badge, 15-digit input capped at 12, name and bank validation focus passed.
- Task 3: implemented as planned, not committed. Original 7 wallet tests passed; typecheck, lint, full suite (516 passed, 121 skipped), and mock-mode production build passed before adding the regression below. Browser checks for Task 3 have not run.
- Task 3 blocker: `src/web/api/mock.ts` resets its ID counter to zero, while the planned `resetWallet()` only removes the balance. Existing `centme:walletDebited:<id>` markers then prevent a new transfer with a reused ID from debiting. Added a failing behavioral regression in `tests/web/wallet.test.ts`: after reset, a new $10 wallet transfer with the same ID leaves 5000 minor units; expected 4000. Latest focused result: 7 passed, 1 failed. Awaiting Pong's decision to update reset cleanup before proceeding.
- Tasks 4 and 5: not started. No push or PR.

Environment notes: installed Node v24.11.1 emits an engine warning because the project requests Node >=22 <23. Existing dev server on port 3000 uses real endpoints. Browser checks ran against an isolated mock production build on port 3100 with notifications disabled; that server has been stopped. The existing dev server and `.env.local` were not changed. Impeccable context launcher could not install its engine under the sandbox; existing source and palette were inspected directly. Playwright MCP profile was occupied; an isolated headless Playwright browser was used instead.

## Walkthrough results

Completed 2026-10-16 in `D:\U-hackathon_backend`, branch `feat/pay-source-invoice`. The earlier checkpoint records the pause before approval; its reset blocker is resolved. Implementation is committed locally. Push and PR remain intentionally pending Pong's approval.

| Task | Result | Commit |
| --- | --- | --- |
| 0 | Clean baseline; 503 passed / 121 skipped; typecheck passed. Base `e071489` already contains the merged recipient-polish branch with identical source. | Branch created |
| 1 | Banks RED (missing module) then 3 tests GREEN. Full suite 506 passed / 121 skipped; typecheck and lint passed. | `289038d` |
| 2 | Sanitizer RED (3 failures) then 7 format tests GREEN. Full suite 509 passed / 121 skipped; typecheck and lint passed. Keyboard picker, validation focus, and account cap checked in browser. | `471c1a2` |
| 3 | Wallet/reset regressions RED then 9 tests GREEN. Full suite 518 passed / 121 skipped; typecheck, lint, build and browser wallet/card/decline/refresh/reset checks passed. | `584aa7d` |
| 4 | Receipt rendering RED then 5 tests GREEN, including final print amount before animation. Full suite 523 passed / 121 skipped; typecheck and lint passed. | `ba1d31d` |
| 5 | Recovery tests RED then wallet 12 tests GREEN. Final suite 526 passed / 121 skipped; typecheck, lint and production build passed. Final browser run: 84 passed, 0 failed. | `a96a3e4` |

Files changed per task (all relative to the implementation repo):

- Task 1: `src/web/banks.ts`, `src/components/common/BankLogo.tsx`, `src/components/send/RecipientCard.tsx`, `tests/web/banks.test.ts`.
- Task 2: `src/web/format.ts`, `src/components/ui/select.tsx`, `src/components/send/RecipientForm.tsx`, `tests/web/format.test.ts`.
- Task 3: `src/web/wallet.ts`, `src/components/review/BankSheet.tsx`, `src/components/review/ReviewStep.tsx`, `src/components/track/TrackView.tsx`, `src/components/demo/PresenterPanel.tsx`, `src/web/i18n/en.ts`, `src/web/i18n/th.ts`, `tests/web/wallet.test.ts`.
- Task 4: `src/components/track/Receipt.tsx`, `src/app/globals.css`, `src/web/i18n/en.ts`, `src/web/i18n/th.ts`, `tests/web/receipt.test.ts`.
- Task 5 QA fixes: `src/components/send/RecipientForm.tsx`, `src/components/track/TrackView.tsx`, `src/web/wallet.ts`, `tests/web/wallet.test.ts`. This plan records the results in the documentation repo.

Final check summaries:

```text
pnpm typecheck: PASS (tsc --noEmit)
pnpm lint: PASS (eslint .)
pnpm test: Test Files 34 passed | 12 skipped (46)
           Tests 526 passed | 121 skipped (647)
pnpm build: PASS; compiled successfully, static generation and route collection completed
Browser: TOTAL 84 passed, 0 failed
PDFs: 5 files, each 1 page; receipt-only text; full Snowtrace URL present in testnet fixture
```

Browser coverage ran in mock mode with notifications disabled, separately from the existing live-mode server. Each combination (EN/TH × 1280px/375px) passed:

- Keyboard-only SCB selection, visible badge, bank-error focus, and 15 typed digits capped at 12.
- Native clipboard pastes `123-456-7890` and `12 3456 7890 123` correctly become `1234567890` and `123456789012`.
- Native radio arrow-key selection, initial $50.00 wallet, $10.00 wallet payment reducing balance to $40.00, and correct paid-from receipt row.
- Normal refresh without a second debit; accepted fetched snapshot with missing debit marker reconciles once, with another refresh leaving $40.00.
- Missing stored source hides the paid-from row.
- $45.00 wallet payment disabled after spending $10.00, with localized insufficient-balance text; card succeeds and leaves wallet unchanged.
- Declined funding leaves wallet unchanged.
- Sheet and receipt have no horizontal overflow at either width; mobile receipt actions stack. No runtime page errors.

The earlier Task 3 browser run additionally verified a second $10.00 wallet payment (balance $30.00), presenter reset restoring $50.00, and a fresh wallet payment debiting correctly after the mock counter reused transfer IDs.

Print verification: EN/TH at both widths produced clean A4 single-page PDFs with the wordmark, invoice number, parties, amounts, fee, rate and references. Header, footer, timeline, Details, action buttons, presenter panel and toasts were absent. A controlled testnet snapshot fixture additionally verified the full Snowtrace URL on paper; it is not evidence of a real chain transaction. PDF pages were rendered to PNG and inspected. The print button calls `window.print()`.

Corrections and rulings:

1. Start from merged `centme-main`: its source matches `feat/ui-polish-recipient` exactly. This avoids switching back to stale branch metadata; no source difference was accepted.
2. Pong approved reset cleanup after the failing reused-ID regression. `centme:walletTransfers` indexes wallet-owned source/debit keys because `KeyValueStore` does not enumerate storage. Reset removes those keys and balance, preserving unrelated session data. Without this correction, new transfers after presenter reset could skip debits.
3. Native `maxLength` cuts formatted clipboard text before `onChange`. The explicit `onPaste` path sanitizes the whole insertion before applying the digit cap, including the existing selection. Without it, a valid formatted 12-digit paste loses digits.
4. Invoice print output uses the final destination amount independently of the screen counter and prints text in black. Without it, printing during animation could record an intermediate amount.
5. One fresh final reviewer found accepted funding could arrive without its POST response reaching the browser. `reconcileFunding` now handles both responses and fetched snapshots, with once-only markers and an ACCEPTED-only gate. Pending, declined and contract-drift snapshots do not debit. Without it, a completed wallet transfer could leave balance unchanged.
6. The reviewer did not independently judge native print dialogs, rendered layout or screen-reader behavior. Layout and Chromium print-to-PDF were checked separately. Actual OS print-dialog interaction and a screen-reader walkthrough were not run; platform-specific issues could remain. No minor review findings were deferred.

Limits and intentionally skipped actions:

- The 121 skipped tests are unchanged from baseline. No protected backend paths, dependency files or environment files were modified.
- Local Node v24.11.1 emits the existing engine warning because the project requests Node >=22 <23; all executed checks passed.
- No push, PR, merge or deployment. The feature branch remains in the user's implementation checkout.
- The temporary mock QA server was stopped. The existing dev server and `.env.local` were left in place.

Browser scripts, JSON results, screenshots and QA PDFs are saved under `C:\Users\Admin\.codex\visualizations\2026\10\15\01a1416f-ce66-70c1-a732-86915ccc6c3f\centme-invoice\`. Final functional evidence is `walkthrough-final.json` (84 passed / 0 failed). Earlier JSON reports preserve the detected defect and test-harness corrections; final results supersede those.
