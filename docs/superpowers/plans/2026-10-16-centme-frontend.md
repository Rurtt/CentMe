# CentMe Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the CentMe sender web UI (Send → Review & pay → Track → Receipt) that runs fully on a contract-faithful mock today and switches to the team's real `/api` endpoints one group at a time.

**Architecture:** Next.js App Router client pages consume one `ApiClient` interface. A router picks the real `fetch` client or an in-browser mock per endpoint group from `NEXT_PUBLIC_REAL_ENDPOINTS`. Pure TypeScript modules (`money`, `status`, `i18n`, `transferPoller`) hold all logic and are unit-tested with Vitest; React components stay thin.

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS v4, shadcn/ui (button, dialog, sonner), lucide-react, zod, Vitest. Node 20+ (machine has Node 24, npm 11).

**Spec:** `docs/superpowers/specs/2026-10-16-centme-frontend-design.md` (read it with this plan). API contract: `docs/api-contract.md`.

## Global Constraints

- All money values are unsigned base-10 integer strings (USD cents, THB satang, USDC 6-decimal units). Use `BigInt` for every money calculation; never `Number`/floating point for money.
- Frontend never creates or edits files under `app/api/` (backend owners' territory: persons 2, 3, 4).
- Requests send only contract fields. Never send a rate, fee, token address, wallet, payout amount or status from the browser.
- Evidence honesty: funding, conversion and payout are tagged `SIMULATED`; real settlement `TESTNET · Fuji`; mock settlement `MOCK` with no explorer link. Completion copy exactly: "Demo completed — THB payout simulated."
- Mock mode always shows the `MOCK DATA` banner and never shows a Snowtrace link.
- Idempotency keys are created once per logical action and reused on every retry of that action.
- Accessibility: body text ≥16px, contrast ≥4.5:1, visible focus rings, color never the only signal, `prefers-reduced-motion` respected.
- Light mode only. One primary (lime) button per screen.
- Language: English default, TH/EN toggle; every user-visible string comes from `lib/i18n`.
- App location: if the team's shared Next.js app exists, use its root. Otherwise this plan creates it at `web/`. **All paths below are relative to the app root**, and every command runs from the app root.
- Commit messages end with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` when an agent commits.

## Review Focus

1. Double-clicking **Confirm payment** or retrying after a slow response must create exactly one transfer (same idempotency key replays) → pinned in Task 7 (`replays createTransfer with the same key`).
2. A polling `GET` that returns an older snapshot after a newer `advance` response must not move the UI backwards → pinned in Task 8 (`ignores snapshots older than the latest version`).
3. Refreshing `/transfers/<id>?fund=1` or pressing **Finish payment** twice must not fund twice → pinned in Task 7 (`replays simulateFunding with the same key`).
4. A real backend that sends an unknown status or drifts from the schema must show the hold state and keep working, not crash → pinned in Task 5 (`unknown status renders a hold`) and Task 6 (`reports schema mismatch but still returns data`).
5. Network loss during tracking must back off (4s → 8s → 10s) and recover without flooding → pinned in Task 8 (`backs off on errors and resets after success`).

---

### Task 1: Join or create the app, add tooling

**Files:**
- Create (only if no shared app exists): `web/` via create-next-app
- Create: `vitest.config.ts`, `.env.example`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces: `npm test` runs Vitest over `lib/**/*.test.ts`; `@/` import alias points to the app root; shadcn components at `components/ui/button.tsx`, `components/ui/dialog.tsx`, `components/ui/sonner.tsx`; `cn()` at `lib/utils.ts`.

- [ ] **Step 1: Check for the shared app**

```bash
cd /d/U-Hackathon && git pull && ls package.json web/package.json 2>/dev/null
```

If person 3 (integration lead) has pushed a Next.js app, use its root as the app root and skip Step 2. Otherwise confirm with person 3 that you are creating it, then continue.

- [ ] **Step 2: Create the app (only if none exists)**

```bash
cd /d/U-Hackathon
npx create-next-app@latest web --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes
cd web
```

Tell the team: "Next.js app is at `web/`. Vercel root directory = `web`. Route handlers go in `web/app/api/`."

- [ ] **Step 3: Install dependencies and shadcn**

```bash
npm i zod
npm i -D vitest
npx shadcn@latest init -d
npx shadcn@latest add button dialog sonner -y
npm ls lucide-react tw-animate-css
```

Expected: `lucide-react` and `tw-animate-css` are listed (shadcn installs them). If `tw-animate-css` is missing, run `npm i tw-animate-css`.

- [ ] **Step 4: Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: { environment: "node", include: ["lib/**/*.test.ts"] },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});
```

In `package.json` `scripts`, add `"test": "vitest run"`.

- [ ] **Step 5: Env example**

Create `.env.example`:

```bash
# Endpoint groups served by the real backend. Comma list of: session,recipients,quotes,transfers (or "all").
# Unlisted groups use the in-browser mock. Flip quotes before transfers.
NEXT_PUBLIC_REAL_ENDPOINTS=
# ntfy.sh topic the presenter's phone subscribes to (mock mode sends from the browser). Long and random.
NEXT_PUBLIC_NTFY_TOPIC=
```

Generate a topic and put it in `.env.local` (not committed):

```bash
node -e "console.log('NEXT_PUBLIC_NTFY_TOPIC=centme-' + require('crypto').randomBytes(12).toString('hex'))" >> .env.local
```

create-next-app's `.gitignore` ignores `.env*`, which would also hide `.env.example`. Append one line to `.gitignore`:

```
!.env.example
```

Keep Vitest files out of Next's type-check (they use loose mock typings). In `tsconfig.json`, set:

```json
"exclude": ["node_modules", "**/*.test.ts", "vitest.config.ts"]
```

- [ ] **Step 6: Verify**

Run: `npx vitest run --passWithNoTests && npm run build`
Expected: Vitest exits 0 with "No test files found"; Next build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A . ':!.env.local'
git commit -m "chore(web): scaffold CentMe frontend tooling"
```

---

### Task 2: Money and format helpers

**Files:**
- Create: `lib/lang.ts`, `lib/money.ts`, `lib/format.ts`
- Test: `lib/money.test.ts`, `lib/format.test.ts`

**Interfaces:**
- Produces:
  - `type Lang = "en" | "th"`, `LOCALE: Record<Lang, string>`
  - `FIXTURE` (`version`, `feeBps`, `rateNumerator`, `rateDenominator`, `minDebitMinor`, `maxDebitMinor` as bigint)
  - `type ParseError = "EMPTY" | "FORMAT" | "TOO_SMALL" | "TOO_LARGE"`, `parseUsdInput(raw: string): { ok: true; minor: string } | { ok: false; error: ParseError }`
  - `type Estimate = { sourceDebitMinor; feeMinor; conversionPrincipalMinor; destinationNetMinor; settlementTokenUnits }` (all `string`), `estimateQuote(debitMinor: string): Estimate`
  - `formatMinor(minor: string, currency: "USD" | "THB", lang?: Lang): string`, `formatRate(num: string, den: string, lang?: Lang): string`, `formatTokenUnits(units: string, decimals?: number, symbol?: string): string`, `minorToInput(minor: string): string`
  - `maskAccount(display: string): string`, `shortHash(hash: string): string`, `formatCountdown(ms: number): string`, `initials(name: string): string`, `formatDateTime(iso: string, lang: Lang): string`

- [ ] **Step 1: Write the failing tests**

`lib/money.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { estimateQuote, formatMinor, formatRate, formatTokenUnits, minorToInput, parseUsdInput } from "./money";

describe("parseUsdInput", () => {
  it.each([
    ["10", "1000"], ["10.5", "1050"], ["10.50", "1050"], [" 1 ", "100"], ["100.00", "10000"], ["010", "1000"],
  ])("accepts %s", (raw, minor) => {
    expect(parseUsdInput(raw)).toEqual({ ok: true, minor });
  });

  it.each([
    ["", "EMPTY"], ["   ", "EMPTY"], ["abc", "FORMAT"], ["1e2", "FORMAT"], ["-5", "FORMAT"], ["+5", "FORMAT"],
    ["10.505", "FORMAT"], ["10.", "FORMAT"], ["1,000", "FORMAT"], ["๑๐", "FORMAT"],
    ["0.99", "TOO_SMALL"], ["0", "TOO_SMALL"], ["100.01", "TOO_LARGE"],
  ])("rejects %s as %s", (raw, error) => {
    expect(parseUsdInput(raw)).toEqual({ ok: false, error });
  });
});

describe("estimateQuote", () => {
  it("matches the contract example for $10.00", () => {
    expect(estimateQuote("1000")).toEqual({
      sourceDebitMinor: "1000", feeMinor: "20", conversionPrincipalMinor: "980",
      destinationNetMinor: "34300", settlementTokenUnits: "9800000",
    });
  });
  it("rounds the 2% fee up to a whole cent", () => {
    expect(estimateQuote("101").feeMinor).toBe("3");
  });
  it("handles both bounds", () => {
    expect(estimateQuote("100")).toMatchObject({ feeMinor: "2", destinationNetMinor: "3430" });
    expect(estimateQuote("10000")).toMatchObject({ feeMinor: "200", destinationNetMinor: "343000" });
  });
});

describe("formatting", () => {
  it("formats USD and THB minor units", () => {
    expect(formatMinor("1000", "USD")).toBe("$10.00");
    expect(formatMinor("5", "USD")).toBe("$0.05");
    expect(formatMinor("34300", "THB")).toBe("฿343.00");
    expect(formatMinor("343000", "THB")).toBe("฿3,430.00");
    expect(formatMinor("343000", "THB", "th")).toBe("฿3,430.00");
  });
  it("formats the rate without floats", () => {
    expect(formatRate("35", "1")).toBe("1 USD = 35 THB");
    expect(formatRate("71", "2")).toBe("1 USD = 35.5 THB");
  });
  it("formats token units", () => {
    expect(formatTokenUnits("9800000")).toBe("9.80 USDC");
    expect(formatTokenUnits("9812345")).toBe("9.812345 USDC");
    expect(formatTokenUnits("1000000")).toBe("1.00 USDC");
  });
  it("turns minor units back into input text", () => {
    expect(minorToInput("1050")).toBe("10.50");
    expect(minorToInput("100")).toBe("1.00");
  });
});
```

`lib/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatCountdown, initials, maskAccount, shortHash } from "./format";

describe("format", () => {
  it("masks the account to the last four characters", () => {
    expect(maskAccount("TEST ACCOUNT 0001")).toBe("••0001");
  });
  it("shortens long hashes only", () => {
    expect(shortHash("0x1234")).toBe("0x1234");
    expect(shortHash("0x" + "a".repeat(64))).toBe("0xaaaaaaaa…aaaaaa");
  });
  it("formats a countdown, never negative", () => {
    expect(formatCountdown(300_000)).toBe("5:00");
    expect(formatCountdown(59_000)).toBe("0:59");
    expect(formatCountdown(59_001)).toBe("1:00");
    expect(formatCountdown(-5)).toBe("0:00");
  });
  it("builds initials", () => {
    expect(initials("Demo Recipient")).toBe("DR");
    expect(initials("  solo ")).toBe("S");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/money.test.ts lib/format.test.ts`
Expected: FAIL, cannot resolve `./money` and `./format`.

- [ ] **Step 3: Implement**

`lib/lang.ts`:

```ts
export type Lang = "en" | "th";
export const LOCALE: Record<Lang, string> = { en: "en-US", th: "th-TH" };
```

`lib/money.ts`:

```ts
import { LOCALE, type Lang } from "./lang";

/** Mirrors the contract's fixture-us-th-v1. Estimates only; the server quote is authoritative. */
export const FIXTURE = {
  version: "fixture-us-th-v1",
  feeBps: 200n,
  rateNumerator: 35n,
  rateDenominator: 1n,
  minDebitMinor: 100n,
  maxDebitMinor: 10000n,
} as const;

export type ParseError = "EMPTY" | "FORMAT" | "TOO_SMALL" | "TOO_LARGE";
export type ParseResult = { ok: true; minor: string } | { ok: false; error: ParseError };

export function parseUsdInput(raw: string): ParseResult {
  const s = raw.trim();
  if (s === "") return { ok: false, error: "EMPTY" };
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return { ok: false, error: "FORMAT" };
  const minor = BigInt(m[1]) * 100n + BigInt((m[2] ?? "").padEnd(2, "0"));
  if (minor < FIXTURE.minDebitMinor) return { ok: false, error: "TOO_SMALL" };
  if (minor > FIXTURE.maxDebitMinor) return { ok: false, error: "TOO_LARGE" };
  return { ok: true, minor: minor.toString() };
}

export type Estimate = {
  sourceDebitMinor: string;
  feeMinor: string;
  conversionPrincipalMinor: string;
  destinationNetMinor: string;
  settlementTokenUnits: string;
};

export function estimateQuote(debitMinor: string): Estimate {
  const debit = BigInt(debitMinor);
  const fee = (debit * FIXTURE.feeBps + 9999n) / 10000n; // ceil to a whole cent
  const principal = debit - fee;
  // THB satang = floor(principal × num × 10^2 / (den × 10^2))
  const thb = (principal * FIXTURE.rateNumerator * 100n) / (FIXTURE.rateDenominator * 100n);
  return {
    sourceDebitMinor: debit.toString(),
    feeMinor: fee.toString(),
    conversionPrincipalMinor: principal.toString(),
    destinationNetMinor: thb.toString(),
    settlementTokenUnits: (principal * 10000n).toString(),
  };
}

const SYMBOL = { USD: "$", THB: "฿" } as const;

export function formatMinor(minor: string, currency: "USD" | "THB", lang: Lang = "en"): string {
  const v = BigInt(minor);
  const abs = v < 0n ? -v : v;
  const whole = new Intl.NumberFormat(LOCALE[lang]).format(abs / 100n);
  const frac = (abs % 100n).toString().padStart(2, "0");
  return `${v < 0n ? "-" : ""}${SYMBOL[currency]}${whole}.${frac}`;
}

export function formatRate(num: string, den: string, lang: Lang = "en"): string {
  const scaled = (BigInt(num) * 10000n) / BigInt(den);
  const whole = new Intl.NumberFormat(LOCALE[lang]).format(scaled / 10000n);
  const frac = (scaled % 10000n).toString().padStart(4, "0").replace(/0+$/, "");
  return `1 USD = ${whole}${frac ? "." + frac : ""} THB`;
}

export function formatTokenUnits(units: string, decimals = 6, symbol = "USDC"): string {
  const v = BigInt(units);
  const base = 10n ** BigInt(decimals);
  let frac = (v % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  if (frac.length < 2) frac = frac.padEnd(2, "0");
  return `${v / base}.${frac} ${symbol}`;
}

export function minorToInput(minor: string): string {
  const v = BigInt(minor);
  return `${v / 100n}.${(v % 100n).toString().padStart(2, "0")}`;
}
```

`lib/format.ts`:

```ts
import { LOCALE, type Lang } from "./lang";

export function maskAccount(display: string): string {
  return `••${display.replace(/\s+/g, "").slice(-4)}`;
}

export function shortHash(hash: string): string {
  return hash.length <= 16 ? hash : `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("");
}

export function formatDateTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { dateStyle: "medium", timeStyle: "medium" }).format(new Date(iso));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/money.test.ts lib/format.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add lib/lang.ts lib/money.ts lib/format.ts lib/money.test.ts lib/format.test.ts
git commit -m "feat(web): BigInt money parsing, fixture estimate and formatters"
```

---

### Task 3: Contract types and zod schemas

**Files:**
- Create: `lib/api/types.ts`, `lib/api/fixtures.ts`
- Test: `lib/api/types.test.ts`

**Interfaces:**
- Produces from `types.ts`: constants `TRANSFER_STATUSES`, `NEXT_ACTIONS`, `DEMO_SCENARIOS`, `FUNDING_STATUSES`, `SETTLEMENT_STATUSES`, `PAYOUT_STATUSES`; schemas `MetaSchema`, `SessionSchema`, `RecipientSchema`, `RecipientsSchema`, `QuoteSchema`, `TransferSnapshotSchema`, `ErrorEnvelopeSchema`, `envelope(schema)`; types `Session`, `Recipient`, `Quote`, `TransferSnapshot`, `TransferStatus`, `NextAction`, `DemoScenario`.
- Produces from `fixtures.ts`: `contractQuoteExample: Quote`, `contractSnapshotExample: TransferSnapshot`, `snapshotWith(patch): TransferSnapshot`.
- Frontend-only extension: `settlement.mode` and `quote.settlementMode` also allow `"MOCK"` (the real backend never sends it). `notification` is optional (requested from person 3).

- [ ] **Step 1: Write the failing test**

`lib/api/types.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { contractQuoteExample, contractSnapshotExample } from "./fixtures";
import { envelope, ErrorEnvelopeSchema, QuoteSchema, TransferSnapshotSchema } from "./types";

const meta = { requestId: "req_1", apiVersion: "v1", replayed: false };

describe("contract schemas", () => {
  it("accept the contract's documented quote and snapshot examples", () => {
    expect(QuoteSchema.safeParse(contractQuoteExample).success).toBe(true);
    expect(envelope(TransferSnapshotSchema).safeParse({ data: contractSnapshotExample, meta }).success).toBe(true);
  });
  it("reject decimal money strings", () => {
    expect(QuoteSchema.safeParse({ ...contractQuoteExample, feeMinor: "0.20" }).success).toBe(false);
  });
  it("reject non-https explorer URLs", () => {
    const bad = {
      ...contractSnapshotExample,
      settlement: { ...contractSnapshotExample.settlement, explorerUrl: "javascript:alert(1)" },
    };
    expect(TransferSnapshotSchema.safeParse(bad).success).toBe(false);
  });
  it("parse the contract error envelope", () => {
    const parsed = ErrorEnvelopeSchema.parse({
      error: { code: "IDEMPOTENCY_CONFLICT", message: "This request key was already used with different input.", retryable: false, fieldErrors: {} },
      meta: { requestId: "req_error_001", apiVersion: "v1" },
    });
    expect(parsed.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/api/types.test.ts`
Expected: FAIL, cannot resolve `./fixtures`.

- [ ] **Step 3: Implement**

`lib/api/types.ts`:

```ts
import { z } from "zod";

export const TRANSFER_STATUSES = [
  "FUNDING_PENDING", "FUNDED_SIMULATED", "FUNDING_FAILED", "SETTLEMENT_PENDING", "SETTLED",
  "SETTLEMENT_FAILED", "PAYOUT_PENDING", "PAYOUT_FAILED", "REVIEW_REQUIRED", "COMPLETED_SIMULATED",
] as const;
export const NEXT_ACTIONS = ["SIMULATE_FUNDING", "ADVANCE", "RETRY_PAYOUT", "NONE"] as const;
export const DEMO_SCENARIOS = ["HAPPY_PATH", "FUNDING_DECLINED", "PAYOUT_FAILED"] as const;
export const FUNDING_STATUSES = ["PENDING", "ACCEPTED", "DECLINED"] as const;
export const SETTLEMENT_STATUSES = ["NOT_STARTED", "PREPARING", "BROADCAST", "PENDING", "CONFIRMED", "FAILED", "REVIEW_REQUIRED"] as const;
export const PAYOUT_STATUSES = ["NOT_STARTED", "PENDING", "PAID", "FAILED", "UNKNOWN"] as const;

const minor = z.string().regex(/^(0|[1-9]\d*)$/, "expected an integer string");
const iso = z.string().min(1);

export const MetaSchema = z.object({ requestId: z.string(), apiVersion: z.string(), replayed: z.boolean().optional() });

export const SessionSchema = z.object({ sessionId: z.string(), mode: z.literal("DEMO"), expiresAt: iso });

export const RecipientSchema = z.object({
  id: z.string(), name: z.string(), country: z.string(), currency: z.string(),
  bankLabel: z.string(), accountDisplay: z.string(), isSynthetic: z.boolean(),
});
export const RecipientsSchema = z.object({ recipients: z.array(RecipientSchema) });

export const QuoteSchema = z.object({
  id: z.string(), recipientId: z.string(),
  sourceCountry: z.literal("US"), destinationCountry: z.literal("TH"),
  sourceCurrency: z.literal("USD"), destinationCurrency: z.literal("THB"),
  sourceDebitMinor: minor, feeMinor: minor, conversionPrincipalMinor: minor,
  fxRateNumerator: minor, fxRateDenominator: minor, destinationNetMinor: minor, settlementTokenUnits: minor,
  fixtureVersion: z.string(), createdAt: iso, expiresAt: iso, mode: z.literal("DEMO"),
  fundingSimulated: z.boolean(), fxSimulated: z.boolean(), payoutSimulated: z.boolean(),
  settlementMode: z.enum(["TESTNET", "MOCK"]), chainId: z.number().int(), arrivalEstimate: z.string().nullable(),
});

export const TransferSnapshotSchema = z.object({
  id: z.string(),
  quoteId: z.string(),
  status: z.enum(TRANSFER_STATUSES),
  version: z.number().int(),
  mode: z.literal("DEMO"),
  purpose: z.string(),
  demoScenario: z.enum(DEMO_SCENARIOS),
  recipient: z.object({
    id: z.string(), name: z.string(), bankLabel: z.string(), accountDisplay: z.string(), isSynthetic: z.boolean(),
  }),
  amounts: z.object({
    sourceCurrency: z.literal("USD"), destinationCurrency: z.literal("THB"),
    sourceDebitMinor: minor, feeMinor: minor, conversionPrincipalMinor: minor,
    destinationNetMinor: minor, settlementTokenUnits: minor,
  }),
  funding: z.object({ mode: z.literal("SIMULATED"), status: z.enum(FUNDING_STATUSES), reference: z.string().nullable() }),
  fx: z.object({ mode: z.literal("SIMULATED"), fixtureVersion: z.string(), rateNumerator: minor, rateDenominator: minor }),
  settlement: z.object({
    mode: z.enum(["TESTNET", "MOCK"]),
    status: z.enum(SETTLEMENT_STATUSES),
    chainId: z.number().int(),
    tokenSymbol: z.string(),
    tokenAddress: z.string(),
    tokenDecimals: z.number().int(),
    txHash: z.string().nullable(),
    explorerUrl: z.string().regex(/^https:\/\//, "explorer URL must be https").nullable(),
    verifiedAt: iso.nullable(),
  }),
  payout: z.object({ mode: z.literal("SIMULATED"), status: z.enum(PAYOUT_STATUSES), reference: z.string().nullable() }),
  notification: z.object({ channel: z.literal("NTFY"), status: z.enum(["NOT_SENT", "SENT", "FAILED"]) }).optional(),
  events: z.array(z.object({ sequence: z.number().int(), status: z.string(), createdAt: iso })),
  lastIssue: z.object({ code: z.string(), message: z.string(), retryable: z.boolean() }).nullable(),
  nextAction: z.enum(NEXT_ACTIONS),
  receipt: z.object({ id: z.string(), issuedAt: iso, summary: z.string() }).nullable(),
  createdAt: iso,
  updatedAt: iso,
});

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
    fieldErrors: z.record(z.string(), z.string()).optional(),
  }),
  meta: z.object({ requestId: z.string().optional(), apiVersion: z.string().optional() }).optional(),
});

export function envelope<T extends z.ZodType>(data: T) {
  return z.object({ data, meta: MetaSchema });
}

export type Session = z.infer<typeof SessionSchema>;
export type Recipient = z.infer<typeof RecipientSchema>;
export type Quote = z.infer<typeof QuoteSchema>;
export type TransferSnapshot = z.infer<typeof TransferSnapshotSchema>;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];
export type NextAction = (typeof NEXT_ACTIONS)[number];
export type DemoScenario = (typeof DEMO_SCENARIOS)[number];
```

`lib/api/fixtures.ts` (copied from `docs/api-contract.md` sections 4 and 6; documentation fixtures, not real transfers):

```ts
import type { Quote, TransferSnapshot, TransferStatus, NextAction } from "./types";

export const contractQuoteExample: Quote = {
  id: "quote_demo_001",
  recipientId: "recipient_demo_th_001",
  sourceCountry: "US",
  destinationCountry: "TH",
  sourceCurrency: "USD",
  destinationCurrency: "THB",
  sourceDebitMinor: "1000",
  feeMinor: "20",
  conversionPrincipalMinor: "980",
  fxRateNumerator: "35",
  fxRateDenominator: "1",
  destinationNetMinor: "34300",
  settlementTokenUnits: "9800000",
  fixtureVersion: "fixture-us-th-v1",
  createdAt: "2026-10-15T15:00:00Z",
  expiresAt: "2026-10-15T15:05:00Z",
  mode: "DEMO",
  fundingSimulated: true,
  fxSimulated: true,
  payoutSimulated: true,
  settlementMode: "TESTNET",
  chainId: 43113,
  arrivalEstimate: null,
};

export const contractSnapshotExample: TransferSnapshot = {
  id: "transfer_demo_001",
  quoteId: "quote_demo_001",
  status: "SETTLEMENT_PENDING",
  version: 3,
  mode: "DEMO",
  purpose: "PERSONAL_REMITTANCE",
  demoScenario: "HAPPY_PATH",
  recipient: {
    id: "recipient_demo_th_001",
    name: "Demo Recipient",
    bankLabel: "Demo Thai Bank",
    accountDisplay: "TEST ACCOUNT 0001",
    isSynthetic: true,
  },
  amounts: {
    sourceCurrency: "USD",
    destinationCurrency: "THB",
    sourceDebitMinor: "1000",
    feeMinor: "20",
    conversionPrincipalMinor: "980",
    destinationNetMinor: "34300",
    settlementTokenUnits: "9800000",
  },
  funding: { mode: "SIMULATED", status: "ACCEPTED", reference: "funding_demo_001" },
  fx: { mode: "SIMULATED", fixtureVersion: "fixture-us-th-v1", rateNumerator: "35", rateDenominator: "1" },
  settlement: {
    mode: "TESTNET",
    status: "PREPARING",
    chainId: 43113,
    tokenSymbol: "USDC",
    tokenAddress: "0x5425890298aed601595a70AB815c96711a31Bc65",
    tokenDecimals: 6,
    txHash: null,
    explorerUrl: null,
    verifiedAt: null,
  },
  payout: { mode: "SIMULATED", status: "NOT_STARTED", reference: null },
  events: [
    { sequence: 1, status: "FUNDING_PENDING", createdAt: "2026-10-15T15:01:00Z" },
    { sequence: 2, status: "FUNDED_SIMULATED", createdAt: "2026-10-15T15:01:02Z" },
    { sequence: 3, status: "SETTLEMENT_PENDING", createdAt: "2026-10-15T15:01:03Z" },
  ],
  lastIssue: null,
  nextAction: "ADVANCE",
  receipt: null,
  createdAt: "2026-10-15T15:01:00Z",
  updatedAt: "2026-10-15T15:01:03Z",
};

type Patch = {
  status: TransferStatus;
  nextAction?: NextAction;
  version?: number;
  funding?: Partial<TransferSnapshot["funding"]>;
  settlement?: Partial<TransferSnapshot["settlement"]>;
  payout?: Partial<TransferSnapshot["payout"]>;
  lastIssue?: TransferSnapshot["lastIssue"];
  notification?: TransferSnapshot["notification"];
  receipt?: TransferSnapshot["receipt"];
};

/** Test helper: the contract example with a few fields changed. */
export function snapshotWith(patch: Patch): TransferSnapshot {
  const b = contractSnapshotExample;
  return {
    ...b,
    status: patch.status,
    nextAction: patch.nextAction ?? b.nextAction,
    version: patch.version ?? b.version,
    funding: { ...b.funding, ...patch.funding },
    settlement: { ...b.settlement, ...patch.settlement },
    payout: { ...b.payout, ...patch.payout },
    lastIssue: patch.lastIssue === undefined ? b.lastIssue : patch.lastIssue,
    notification: patch.notification ?? b.notification,
    receipt: patch.receipt === undefined ? b.receipt : patch.receipt,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/api/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/api/types.ts lib/api/fixtures.ts lib/api/types.test.ts
git commit -m "feat(web): contract types and zod schemas"
```

---

### Task 4: i18n dictionaries and translate

**Files:**
- Create: `lib/i18n/en.ts`, `lib/i18n/th.ts`, `lib/i18n/translate.ts`, `lib/i18n/LanguageProvider.tsx`
- Test: `lib/i18n/translate.test.ts`

**Interfaces:**
- Consumes: `Lang` from `lib/lang.ts`.
- Produces: `type MessageKey`, `en`, `th`, `type TFn = (key: MessageKey, vars?: Record<string, string>) => string`, `translate(lang, key, vars?)`, `<LanguageProvider>`, `useT(): { lang: Lang; setLang(l: Lang): void; t: TFn }`.

- [ ] **Step 1: Write the failing test**

`lib/i18n/translate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { en, type MessageKey } from "./en";
import { th } from "./th";
import { translate } from "./translate";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("i18n", () => {
  it("has a non-empty Thai string for every English key", () => {
    for (const key of Object.keys(en) as MessageKey[]) {
      expect(th[key], key).toBeTruthy();
    }
  });
  it("uses the same placeholders in both languages", () => {
    for (const key of Object.keys(en) as MessageKey[]) {
      expect(placeholders(th[key]), key).toEqual(placeholders(en[key]));
    }
  });
  it("interpolates variables and leaves unknown ones visible", () => {
    expect(translate("en", "review.pay", { amount: "$10.00" })).toBe("Pay $10.00");
    expect(translate("th", "review.pay", { amount: "$10.00" })).toBe("ชำระ $10.00");
    expect(translate("en", "review.pay")).toBe("Pay {amount}");
  });
  it("keeps the required completion copy", () => {
    expect(translate("en", "receipt.summary")).toBe("Demo completed — THB payout simulated.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/i18n/translate.test.ts`
Expected: FAIL, cannot resolve `./en`.

- [ ] **Step 3: Implement dictionaries**

`lib/i18n/en.ts`:

```ts
export const en = {
  "header.skip": "Skip to content",
  "header.testMode": "Test mode",
  "header.mockData": "Mock data: nothing on this screen is a real transfer.",
  "header.langToggle": "ภาษาไทย",
  "header.langAria": "Switch language to Thai",
  "common.loading": "Loading…",
  "send.title": "Send money to Thailand",
  "send.amountLabel": "You send",
  "send.amountHelp": "USD 1.00 to 100.00 in test mode",
  "send.error.EMPTY": "Enter an amount.",
  "send.error.FORMAT": "Use numbers only, with up to 2 decimals (for example 10.50).",
  "send.error.TOO_SMALL": "The minimum is $1.00.",
  "send.error.TOO_LARGE": "The maximum is $100.00 in test mode.",
  "send.recipientLabel": "To",
  "send.estimate": "Estimate",
  "send.theyReceive": "They receive",
  "send.fee": "Fee",
  "send.rate": "Rate",
  "send.arrival": "Arrival",
  "send.timing": "Demo timing only",
  "send.continue": "Continue",
  "review.title": "Check before you send",
  "review.youSend": "You send",
  "review.edit": "Edit",
  "review.expiresIn": "Expires in {time}",
  "review.expired": "Quote expired",
  "review.pay": "Pay {amount}",
  "review.newQuote": "Get new quote",
  "review.alreadyUsed": "This quote was already used. Please start again.",
  "sheet.title": "Confirm payment",
  "sheet.simNote": "Simulated bank payment. No real money moves.",
  "sheet.from": "Pay from",
  "sheet.account": "Demo Checking ••4821",
  "sheet.confirm": "Confirm payment",
  "sheet.cancel": "Cancel",
  "tag.SIMULATED": "Simulated",
  "tag.TESTNET": "Testnet · Fuji",
  "tag.MOCK": "Mock",
  "step.funding": "Payment received",
  "step.conversion": "Converted to USDC",
  "step.settlement": "Sent on Avalanche Fuji",
  "step.settlementMock": "Settlement (mock, no blockchain)",
  "step.payout": "Delivered to Thai bank",
  "state.todo": "Not started",
  "state.active": "In progress",
  "state.done": "Done",
  "state.failed": "Failed",
  "state.hold": "On hold",
  "track.headline.paying": "Finishing your payment…",
  "track.headline.sending": "Sending your money",
  "track.headline.done": "Transfer complete",
  "track.headline.fundingFailed": "Payment declined. No money moved.",
  "track.headline.settlementFailed": "The transfer on Fuji failed.",
  "track.headline.payoutFailed": "Bank payout failed. Your USDC transfer is safe.",
  "track.headline.hold": "On hold while we check this transfer.",
  "track.summary": "{send} → {receive} to {name}",
  "track.viewExplorer": "View on Snowtrace",
  "track.notified": "Recipient notified",
  "track.details": "Details",
  "track.notFound": "We couldn't find this transfer.",
  "track.offline": "Can't reach CentMe right now. Retrying…",
  "action.FINISH_PAYMENT": "Finish payment",
  "action.START_OVER": "Start over",
  "action.RETRY_PAYOUT": "Retry payout",
  "action.SEND_ANOTHER": "Send another",
  "action.COPY_LINK": "Copy link",
  "action.copied": "Link copied",
  "receipt.title": "Receipt",
  "receipt.theyReceived": "They received",
  "receipt.summary": "Demo completed — THB payout simulated.",
  "receipt.youSent": "You sent",
  "receipt.usdc": "USDC settled",
  "receipt.recipient": "Recipient",
  "receipt.fundingRef": "Funding reference",
  "receipt.payoutRef": "Payout reference",
  "receipt.txHash": "Transaction hash",
  "receipt.verifiedAt": "Settlement verified",
  "receipt.id": "Receipt ID",
  "receipt.issued": "Issued",
  "detail.network": "Network",
  "detail.networkMock": "Mock (no blockchain transaction)",
  "detail.token": "Token contract",
  "detail.transferId": "Transfer ID",
  "error.generic": "Something went wrong. Reference: {id}",
  "error.network": "Can't reach CentMe. Check your connection and try again.",
  "error.rateLimited": "Too many requests. Wait a moment and try again.",
  "error.recipients": "Couldn't load the recipient. Refresh to try again.",
  "demo.title": "Presenter panel",
  "demo.scenario": "Scenario",
  "demo.HAPPY_PATH": "Happy path",
  "demo.FUNDING_DECLINED": "Funding declined",
  "demo.PAYOUT_FAILED": "Payout failed",
  "demo.endpoints": "Endpoints",
  "demo.reset": "Reset mock data",
  "demo.close": "Close presenter panel",
} as const;

export type MessageKey = keyof typeof en;
```

`lib/i18n/th.ts`:

```ts
import type { MessageKey } from "./en";

export const th: Record<MessageKey, string> = {
  "header.skip": "ข้ามไปยังเนื้อหา",
  "header.testMode": "โหมดทดสอบ",
  "header.mockData": "ข้อมูลจำลอง: รายการบนหน้านี้ไม่ใช่การโอนจริง",
  "header.langToggle": "English",
  "header.langAria": "เปลี่ยนเป็นภาษาอังกฤษ",
  "common.loading": "กำลังโหลด…",
  "send.title": "โอนเงินไปประเทศไทย",
  "send.amountLabel": "คุณโอน",
  "send.amountHelp": "USD 1.00 ถึง 100.00 ในโหมดทดสอบ",
  "send.error.EMPTY": "กรุณากรอกจำนวนเงิน",
  "send.error.FORMAT": "ใช้ตัวเลขเท่านั้น ทศนิยมไม่เกิน 2 ตำแหน่ง (เช่น 10.50)",
  "send.error.TOO_SMALL": "ขั้นต่ำ $1.00",
  "send.error.TOO_LARGE": "สูงสุด $100.00 ในโหมดทดสอบ",
  "send.recipientLabel": "ผู้รับ",
  "send.estimate": "ประมาณการ",
  "send.theyReceive": "ผู้รับจะได้รับ",
  "send.fee": "ค่าธรรมเนียม",
  "send.rate": "อัตราแลกเปลี่ยน",
  "send.arrival": "ระยะเวลา",
  "send.timing": "เวลาสำหรับเดโมเท่านั้น",
  "send.continue": "ดำเนินการต่อ",
  "review.title": "ตรวจสอบก่อนโอน",
  "review.youSend": "คุณโอน",
  "review.edit": "แก้ไข",
  "review.expiresIn": "หมดอายุใน {time}",
  "review.expired": "ราคาหมดอายุแล้ว",
  "review.pay": "ชำระ {amount}",
  "review.newQuote": "ขอราคาใหม่",
  "review.alreadyUsed": "ราคานี้ถูกใช้ไปแล้ว กรุณาเริ่มใหม่",
  "sheet.title": "ยืนยันการชำระเงิน",
  "sheet.simNote": "การชำระเงินผ่านธนาคารแบบจำลอง ไม่มีการตัดเงินจริง",
  "sheet.from": "ชำระจาก",
  "sheet.account": "บัญชีเดโม ••4821",
  "sheet.confirm": "ยืนยันการชำระเงิน",
  "sheet.cancel": "ยกเลิก",
  "tag.SIMULATED": "จำลอง",
  "tag.TESTNET": "Testnet · Fuji",
  "tag.MOCK": "ข้อมูลจำลอง",
  "step.funding": "ได้รับการชำระเงิน",
  "step.conversion": "แปลงเป็น USDC",
  "step.settlement": "ส่งบน Avalanche Fuji",
  "step.settlementMock": "ชำระบัญชี (จำลอง ไม่มีบล็อกเชน)",
  "step.payout": "โอนเข้าธนาคารไทย",
  "state.todo": "ยังไม่เริ่ม",
  "state.active": "กำลังดำเนินการ",
  "state.done": "เสร็จแล้ว",
  "state.failed": "ล้มเหลว",
  "state.hold": "พักไว้",
  "track.headline.paying": "กำลังชำระเงิน…",
  "track.headline.sending": "กำลังส่งเงินของคุณ",
  "track.headline.done": "โอนเงินเสร็จสมบูรณ์",
  "track.headline.fundingFailed": "การชำระเงินถูกปฏิเสธ ไม่มีการตัดเงิน",
  "track.headline.settlementFailed": "การโอนบน Fuji ล้มเหลว",
  "track.headline.payoutFailed": "โอนเข้าธนาคารไม่สำเร็จ การโอน USDC ของคุณยังปลอดภัย",
  "track.headline.hold": "พักรายการไว้ระหว่างตรวจสอบ",
  "track.summary": "{send} → {receive} ถึง {name}",
  "track.viewExplorer": "ดูบน Snowtrace",
  "track.notified": "แจ้งเตือนผู้รับแล้ว",
  "track.details": "รายละเอียด",
  "track.notFound": "ไม่พบรายการนี้",
  "track.offline": "เชื่อมต่อ CentMe ไม่ได้ กำลังลองใหม่…",
  "action.FINISH_PAYMENT": "ชำระเงินให้เสร็จ",
  "action.START_OVER": "เริ่มใหม่",
  "action.RETRY_PAYOUT": "ลองโอนเข้าธนาคารอีกครั้ง",
  "action.SEND_ANOTHER": "โอนอีกครั้ง",
  "action.COPY_LINK": "คัดลอกลิงก์",
  "action.copied": "คัดลอกลิงก์แล้ว",
  "receipt.title": "ใบเสร็จ",
  "receipt.theyReceived": "ผู้รับได้รับ",
  "receipt.summary": "เดโมเสร็จสมบูรณ์ — การโอน THB เป็นการจำลอง",
  "receipt.youSent": "คุณโอน",
  "receipt.usdc": "USDC ที่ชำระ",
  "receipt.recipient": "ผู้รับ",
  "receipt.fundingRef": "เลขอ้างอิงการชำระเงิน",
  "receipt.payoutRef": "เลขอ้างอิงการโอนเข้าธนาคาร",
  "receipt.txHash": "แฮชธุรกรรม",
  "receipt.verifiedAt": "ยืนยันการชำระบัญชีเมื่อ",
  "receipt.id": "เลขที่ใบเสร็จ",
  "receipt.issued": "ออกเมื่อ",
  "detail.network": "เครือข่าย",
  "detail.networkMock": "จำลอง (ไม่มีธุรกรรมบนบล็อกเชน)",
  "detail.token": "สัญญาโทเคน",
  "detail.transferId": "รหัสรายการ",
  "error.generic": "เกิดข้อผิดพลาด รหัสอ้างอิง: {id}",
  "error.network": "เชื่อมต่อ CentMe ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง",
  "error.rateLimited": "มีคำขอมากเกินไป รอสักครู่แล้วลองอีกครั้ง",
  "error.recipients": "โหลดข้อมูลผู้รับไม่ได้ รีเฟรชเพื่อลองอีกครั้ง",
  "demo.title": "แผงผู้นำเสนอ",
  "demo.scenario": "สถานการณ์",
  "demo.HAPPY_PATH": "เส้นทางปกติ",
  "demo.FUNDING_DECLINED": "การชำระเงินถูกปฏิเสธ",
  "demo.PAYOUT_FAILED": "โอนเข้าธนาคารล้มเหลว",
  "demo.endpoints": "Endpoints",
  "demo.reset": "ล้างข้อมูลจำลอง",
  "demo.close": "ปิดแผงผู้นำเสนอ",
};
```

`lib/i18n/translate.ts`:

```ts
import type { Lang } from "../lang";
import { en, type MessageKey } from "./en";
import { th } from "./th";

export type TFn = (key: MessageKey, vars?: Record<string, string>) => string;

const DICTS: Record<Lang, Record<MessageKey, string>> = { en, th };

export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string>): string {
  const template = DICTS[lang][key] ?? en[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match);
}
```

`lib/i18n/LanguageProvider.tsx`:

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Lang } from "../lang";
import { translate, type TFn } from "./translate";

type LanguageContextValue = { lang: Lang; setLang: (lang: Lang) => void; t: TFn };

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "centme:lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "th") setLangState(saved);
    } catch {
      // storage blocked: keep English
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage blocked: language still switches for this visit
    }
  }, []);

  const t = useCallback<TFn>((key, vars) => translate(lang, key, vars), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useT(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useT must be used inside <LanguageProvider>");
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/i18n/translate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/i18n
git commit -m "feat(web): EN/TH dictionaries and language provider"
```

---

### Task 5: Status → timeline view model

**Files:**
- Create: `lib/status.ts`
- Test: `lib/status.test.ts`

**Interfaces:**
- Consumes: `TransferSnapshot` (Task 3), `MessageKey` (Task 4), `snapshotWith` (tests).
- Produces:
  - `type StepId = "funding" | "conversion" | "settlement" | "payout"`
  - `type StepState = "todo" | "active" | "done" | "failed" | "hold"`
  - `type EvidenceTagKind = "SIMULATED" | "TESTNET" | "MOCK"`
  - `type TimelineStep = { id: StepId; state: StepState; tag: EvidenceTagKind; labelKey: MessageKey }`
  - `type PrimaryAction = "FINISH_PAYMENT" | "START_OVER" | "RETRY_PAYOUT" | "SEND_ANOTHER" | null`
  - `type TransferView = { steps: TimelineStep[]; headlineKey: MessageKey; action: PrimaryAction; showReceipt: boolean; issueMessage: string | null; notified: boolean }`
  - `toView(s: TransferSnapshot): TransferView`, `stepTime(s: TransferSnapshot, id: StepId): string | null`

- [ ] **Step 1: Write the failing test**

`lib/status.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { snapshotWith } from "./api/fixtures";
import type { TransferSnapshot } from "./api/types";
import { stepTime, toView } from "./status";

const states = (s: TransferSnapshot) => toView(s).steps.map((x) => x.state);

describe("toView", () => {
  it("funding pending offers Finish payment only when the server asks for funding", () => {
    const v = toView(snapshotWith({ status: "FUNDING_PENDING", nextAction: "SIMULATE_FUNDING", funding: { status: "PENDING" } }));
    expect(v.steps.map((x) => x.state)).toEqual(["active", "todo", "todo", "todo"]);
    expect(v.action).toBe("FINISH_PAYMENT");
    expect(toView(snapshotWith({ status: "FUNDING_PENDING", nextAction: "NONE" })).action).toBeNull();
  });

  it.each([
    ["FUNDED_SIMULATED", ["done", "done", "active", "todo"], null, "track.headline.sending"],
    ["SETTLEMENT_PENDING", ["done", "done", "active", "todo"], null, "track.headline.sending"],
    ["SETTLED", ["done", "done", "done", "active"], null, "track.headline.sending"],
    ["PAYOUT_PENDING", ["done", "done", "done", "active"], null, "track.headline.sending"],
    ["FUNDING_FAILED", ["failed", "todo", "todo", "todo"], "START_OVER", "track.headline.fundingFailed"],
    ["SETTLEMENT_FAILED", ["done", "done", "failed", "todo"], "START_OVER", "track.headline.settlementFailed"],
    ["PAYOUT_FAILED", ["done", "done", "done", "failed"], "RETRY_PAYOUT", "track.headline.payoutFailed"],
    ["COMPLETED_SIMULATED", ["done", "done", "done", "done"], "SEND_ANOTHER", "track.headline.done"],
  ] as const)("%s", (status, expected, action, headline) => {
    const v = toView(snapshotWith({ status }));
    expect(v.steps.map((x) => x.state)).toEqual(expected);
    expect(v.action).toBe(action);
    expect(v.headlineKey).toBe(headline);
    expect(v.showReceipt).toBe(status === "COMPLETED_SIMULATED");
  });

  it("review required holds the first unfinished leg and keeps verified settlement", () => {
    const s = snapshotWith({ status: "REVIEW_REQUIRED", settlement: { status: "CONFIRMED" }, payout: { status: "UNKNOWN" } });
    expect(states(s)).toEqual(["done", "done", "done", "hold"]);
    expect(toView(s).headlineKey).toBe("track.headline.hold");
  });

  it("unknown status renders a hold instead of crashing", () => {
    const s = { ...snapshotWith({ status: "SETTLEMENT_PENDING" }), status: "SOMETHING_NEW" } as unknown as TransferSnapshot;
    expect(states(s)).toEqual(["done", "done", "hold", "todo"]);
    expect(toView(s).action).toBeNull();
  });

  it("tags legs honestly and swaps the settlement label in mock mode", () => {
    const real = toView(snapshotWith({ status: "SETTLED" })).steps;
    expect(real.map((x) => x.tag)).toEqual(["SIMULATED", "SIMULATED", "TESTNET", "SIMULATED"]);
    expect(real[2].labelKey).toBe("step.settlement");
    const mock = toView(snapshotWith({ status: "SETTLED", settlement: { mode: "MOCK" } })).steps;
    expect(mock[2].tag).toBe("MOCK");
    expect(mock[2].labelKey).toBe("step.settlementMock");
  });

  it("surfaces lastIssue and the notification flag", () => {
    const v = toView(snapshotWith({
      status: "SETTLEMENT_PENDING",
      lastIssue: { code: "RPC_TIMEOUT", message: "Settlement outcome is not confirmed yet.", retryable: true },
      notification: { channel: "NTFY", status: "SENT" },
    }));
    expect(v.issueMessage).toBe("Settlement outcome is not confirmed yet.");
    expect(v.notified).toBe(true);
    expect(toView(snapshotWith({ status: "SETTLED" })).notified).toBe(false);
  });
});

describe("stepTime", () => {
  it("returns the event time that completed a step", () => {
    const s = snapshotWith({ status: "SETTLEMENT_PENDING" });
    expect(stepTime(s, "funding")).toBe("2026-10-15T15:01:02Z");
    expect(stepTime(s, "settlement")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/status.test.ts`
Expected: FAIL, cannot resolve `./status`.

- [ ] **Step 3: Implement**

`lib/status.ts`:

```ts
import type { TransferSnapshot } from "./api/types";
import type { MessageKey } from "./i18n/en";

export type StepId = "funding" | "conversion" | "settlement" | "payout";
export type StepState = "todo" | "active" | "done" | "failed" | "hold";
export type EvidenceTagKind = "SIMULATED" | "TESTNET" | "MOCK";
export type TimelineStep = { id: StepId; state: StepState; tag: EvidenceTagKind; labelKey: MessageKey };
export type PrimaryAction = "FINISH_PAYMENT" | "START_OVER" | "RETRY_PAYOUT" | "SEND_ANOTHER" | null;
export type TransferView = {
  steps: TimelineStep[];
  headlineKey: MessageKey;
  action: PrimaryAction;
  showReceipt: boolean;
  issueMessage: string | null;
  notified: boolean;
};

type States = [StepState, StepState, StepState, StepState];
const ORDER: StepId[] = ["funding", "conversion", "settlement", "payout"];

function buildSteps(states: States, s: TransferSnapshot): TimelineStep[] {
  const mock = s.settlement.mode === "MOCK";
  return ORDER.map((id, i) => ({
    id,
    state: states[i],
    tag: id === "settlement" ? (mock ? "MOCK" : "TESTNET") : "SIMULATED",
    labelKey: id === "settlement" ? (mock ? "step.settlementMock" : "step.settlement") : (`step.${id}` as MessageKey),
  }));
}

/** Done legs from evidence; the first unfinished leg is held. */
function holdStates(s: TransferSnapshot): States {
  const funded = s.funding.status === "ACCEPTED";
  const done = [funded, funded, s.settlement.status === "CONFIRMED", s.payout.status === "PAID"];
  let held = false;
  return done.map((d) => {
    if (d) return "done";
    if (!held) {
      held = true;
      return "hold";
    }
    return "todo";
  }) as States;
}

export function toView(s: TransferSnapshot): TransferView {
  const base = {
    issueMessage: s.lastIssue?.message ?? null,
    notified: s.notification?.status === "SENT",
    showReceipt: false,
    action: null as PrimaryAction,
  };
  const view = (states: States, headlineKey: MessageKey, extra: Partial<TransferView> = {}): TransferView => ({
    ...base,
    steps: buildSteps(states, s),
    headlineKey,
    ...extra,
  });

  switch (s.status as string) {
    case "FUNDING_PENDING":
      return view(["active", "todo", "todo", "todo"], "track.headline.paying", {
        action: s.nextAction === "SIMULATE_FUNDING" ? "FINISH_PAYMENT" : null,
      });
    case "FUNDED_SIMULATED":
    case "SETTLEMENT_PENDING":
      return view(["done", "done", "active", "todo"], "track.headline.sending");
    case "SETTLED":
    case "PAYOUT_PENDING":
      return view(["done", "done", "done", "active"], "track.headline.sending");
    case "FUNDING_FAILED":
      return view(["failed", "todo", "todo", "todo"], "track.headline.fundingFailed", { action: "START_OVER" });
    case "SETTLEMENT_FAILED":
      return view(["done", "done", "failed", "todo"], "track.headline.settlementFailed", { action: "START_OVER" });
    case "PAYOUT_FAILED":
      return view(["done", "done", "done", "failed"], "track.headline.payoutFailed", { action: "RETRY_PAYOUT" });
    case "COMPLETED_SIMULATED":
      return view(["done", "done", "done", "done"], "track.headline.done", { action: "SEND_ANOTHER", showReceipt: true });
    default:
      return view(holdStates(s), "track.headline.hold");
  }
}

const DONE_EVENT: Record<StepId, string> = {
  funding: "FUNDED_SIMULATED",
  conversion: "FUNDED_SIMULATED",
  settlement: "SETTLED",
  payout: "COMPLETED_SIMULATED",
};

export function stepTime(s: TransferSnapshot, id: StepId): string | null {
  return s.events.find((e) => e.status === DONE_EVENT[id])?.createdAt ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/status.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/status.ts lib/status.test.ts
git commit -m "feat(web): map transfer snapshots to timeline view"
```

---

### Task 6: API client, real fetch client, routing, storage and idempotency

**Files:**
- Create: `lib/storage.ts`, `lib/idempotency.ts`, `lib/api/errors.ts`, `lib/api/client.ts`, `lib/api/real.ts`, `lib/api/index.ts`, `lib/i18n/errorText.ts`
- Test: `lib/idempotency.test.ts`, `lib/api/real.test.ts`, `lib/api/index.test.ts`

**Interfaces:**
- Consumes: schemas/types (Task 3), `TFn` (Task 4).
- Produces:
  - `storage.ts`: `interface KeyValueStore { getItem(k): string | null; setItem(k, v): void; removeItem(k): void }`, `memoryStore()`, `browserStorage(kind: "local" | "session")`
  - `idempotency.ts`: `uuidV4(): string`, `getOrCreateKey(name: string, store?: KeyValueStore): string`
  - `errors.ts`: `class ApiError` (`status`, `code`, `retryable`, `fieldErrors`, `requestId`, `retryAfterSeconds`), `class NetworkError` (`path`), `isApiError(e, code?)`
  - `client.ts`: `CreateQuoteInput`, `CreateTransferInput`, `interface ApiClient` (8 methods, exact signatures below)
  - `real.ts`: `createRealClient(opts?: { fetchImpl?: typeof fetch; onSchemaMismatch?: (endpoint: string, issues: string[]) => void }): ApiClient`
  - `index.ts`: `ENDPOINT_GROUPS`, `EndpointGroup`, `EndpointModes`, `parseRealEndpoints(raw)`, `interface QuoteMemory { rememberQuote(q: Quote): void }`, `createRoutedClient(modes, real, mock: ApiClient & QuoteMemory): ApiClient`
  - `errorText.ts`: `errorText(e: unknown, t: TFn): string`

- [ ] **Step 1: Write the failing tests**

`lib/idempotency.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getOrCreateKey, uuidV4 } from "./idempotency";
import { memoryStore } from "./storage";

describe("idempotency keys", () => {
  it("generates v4 UUIDs without crypto.randomUUID", () => {
    expect(uuidV4()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it("reuses the same key for the same logical action", () => {
    const store = memoryStore();
    const a = getOrCreateKey("transfer:quote_1", store);
    expect(getOrCreateKey("transfer:quote_1", store)).toBe(a);
    expect(getOrCreateKey("transfer:quote_2", store)).not.toBe(a);
  });
});
```

`lib/api/real.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { ApiError, NetworkError } from "./errors";
import { contractQuoteExample, contractSnapshotExample } from "./fixtures";
import { createRealClient } from "./real";

const meta = { requestId: "req_1", apiVersion: "v1", replayed: false };
const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

describe("real client", () => {
  it("posts the quote request and unwraps data", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(201, { data: contractQuoteExample, meta }));
    const api = createRealClient({ fetchImpl });
    const q = await api.createQuote({ recipientId: "recipient_demo_th_001", sourceDebitMinor: "1000" });
    expect(q.id).toBe("quote_demo_001");
    const [path, init] = fetchImpl.mock.calls[0];
    expect(path).toBe("/api/quotes");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ recipientId: "recipient_demo_th_001", sourceDebitMinor: "1000" });
    expect(init.credentials).toBe("same-origin");
  });

  it("sends the Idempotency-Key on transfer creation", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(201, { data: contractSnapshotExample, meta }));
    const api = createRealClient({ fetchImpl });
    await api.createTransfer({ quoteId: "quote_demo_001", purpose: "PERSONAL_REMITTANCE", demoScenario: "HAPPY_PATH" }, "key-1");
    expect(fetchImpl.mock.calls[0][1].headers["Idempotency-Key"]).toBe("key-1");
  });

  it("turns the error envelope into an ApiError", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(410, {
      error: { code: "QUOTE_EXPIRED", message: "Quote expired.", retryable: false, fieldErrors: {} },
      meta: { requestId: "req_err", apiVersion: "v1" },
    }, { "Retry-After": "3" }));
    const api = createRealClient({ fetchImpl });
    const err = await api.getTransfer("t1").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 410, code: "QUOTE_EXPIRED", requestId: "req_err", retryAfterSeconds: 3 });
  });

  it("re-creates the session once on 401 and retries", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(json(401, { error: { code: "UNAUTHENTICATED", message: "No session.", retryable: false } }))
      .mockResolvedValueOnce(json(200, { data: { sessionId: "s1", mode: "DEMO", expiresAt: "2026-10-17T00:00:00Z" }, meta }))
      .mockResolvedValueOnce(json(200, { data: contractSnapshotExample, meta }));
    const api = createRealClient({ fetchImpl });
    const s = await api.getTransfer("transfer_demo_001");
    expect(s.id).toBe("transfer_demo_001");
    expect(fetchImpl.mock.calls.map((c) => c[0])).toEqual([
      "/api/transfers/transfer_demo_001", "/api/demo/session", "/api/transfers/transfer_demo_001",
    ]);
  });

  it("reports schema mismatch but still returns data", async () => {
    const drifted = { ...contractSnapshotExample, status: "SOMETHING_NEW" };
    const fetchImpl = vi.fn().mockResolvedValue(json(200, { data: drifted, meta }));
    const onSchemaMismatch = vi.fn();
    const api = createRealClient({ fetchImpl, onSchemaMismatch });
    const s = await api.getTransfer("transfer_demo_001");
    expect(s.status).toBe("SOMETHING_NEW");
    expect(onSchemaMismatch).toHaveBeenCalledWith("GET /api/transfers/transfer_demo_001", expect.arrayContaining([expect.stringContaining("status")]));
  });

  it("wraps fetch failures in NetworkError", async () => {
    const api = createRealClient({ fetchImpl: vi.fn().mockRejectedValue(new TypeError("offline")) });
    await expect(api.getRecipients()).rejects.toBeInstanceOf(NetworkError);
  });
});
```

`lib/api/index.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import type { ApiClient } from "./client";
import { contractQuoteExample } from "./fixtures";
import { createRoutedClient, parseRealEndpoints } from "./index";

function stubClient(name: string): ApiClient {
  const fn = () => vi.fn().mockResolvedValue(name);
  return {
    createSession: fn(), getRecipients: fn(), createQuote: vi.fn().mockResolvedValue(contractQuoteExample),
    createTransfer: fn(), getTransfer: fn(), simulateFunding: fn(), advance: fn(), retryPayout: fn(),
  } as unknown as ApiClient;
}

describe("endpoint routing", () => {
  it("parses the env list", () => {
    expect(parseRealEndpoints(undefined)).toEqual({ session: "mock", recipients: "mock", quotes: "mock", transfers: "mock" });
    expect(parseRealEndpoints(" Quotes, session ")).toEqual({ session: "real", recipients: "mock", quotes: "real", transfers: "mock" });
    expect(parseRealEndpoints("all")).toEqual({ session: "real", recipients: "real", quotes: "real", transfers: "real" });
  });

  it("routes each group and lets the mock remember real quotes", async () => {
    const real = stubClient("real");
    const mock = { ...stubClient("mock"), rememberQuote: vi.fn() };
    const api = createRoutedClient(parseRealEndpoints("quotes"), real, mock);
    await api.createQuote({ recipientId: "r", sourceDebitMinor: "1000" });
    expect(real.createQuote).toHaveBeenCalled();
    expect(mock.rememberQuote).toHaveBeenCalledWith(contractQuoteExample);
    expect(await api.getTransfer("t1")).toBe("mock");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/idempotency.test.ts lib/api/real.test.ts lib/api/index.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`lib/storage.ts`:

```ts
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

const fallback = { local: memoryStore(), session: memoryStore() };

/** Browser storage that never throws; falls back to memory on the server or when storage is blocked. */
export function browserStorage(kind: "local" | "session"): KeyValueStore {
  let target: Storage | null = null;
  try {
    if (typeof window !== "undefined") target = kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    target = null;
  }
  if (!target) return fallback[kind];
  const s = target;
  return {
    getItem: (k) => {
      try { return s.getItem(k); } catch { return fallback[kind].getItem(k); }
    },
    setItem: (k, v) => {
      try { s.setItem(k, v); } catch { fallback[kind].setItem(k, v); }
    },
    removeItem: (k) => {
      try { s.removeItem(k); } catch { fallback[kind].removeItem(k); }
    },
  };
}
```

`lib/idempotency.ts`:

```ts
import { browserStorage, type KeyValueStore } from "./storage";

/** crypto.randomUUID needs a secure context; getRandomValues also works over plain http on a LAN. */
export function uuidV4(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** One key per logical action; every retry of that action reuses it. */
export function getOrCreateKey(name: string, store: KeyValueStore = browserStorage("session")): string {
  const storageKey = `centme:key:${name}`;
  const existing = store.getItem(storageKey);
  if (existing) return existing;
  const fresh = uuidV4();
  store.setItem(storageKey, fresh);
  return fresh;
}
```

`lib/api/errors.ts`:

```ts
export type ApiErrorInit = {
  status: number;
  code: string;
  message: string;
  retryable: boolean;
  fieldErrors: Record<string, string>;
  requestId: string | null;
  retryAfterSeconds: number | null;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;
  readonly fieldErrors: Record<string, string>;
  readonly requestId: string | null;
  readonly retryAfterSeconds: number | null;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.retryable = init.retryable;
    this.fieldErrors = init.fieldErrors;
    this.requestId = init.requestId;
    this.retryAfterSeconds = init.retryAfterSeconds;
  }
}

export class NetworkError extends Error {
  readonly path: string;
  constructor(path: string, cause?: unknown) {
    super(`Network request failed: ${path}`, { cause });
    this.name = "NetworkError";
    this.path = path;
  }
}

export function isApiError(e: unknown, code?: string): e is ApiError {
  return e instanceof ApiError && (code === undefined || e.code === code);
}
```

`lib/api/client.ts`:

```ts
import type { DemoScenario, Quote, Recipient, Session, TransferSnapshot } from "./types";

export type CreateQuoteInput = { recipientId: string; sourceDebitMinor: string };
export type CreateTransferInput = { quoteId: string; purpose: "PERSONAL_REMITTANCE"; demoScenario: DemoScenario };

export interface ApiClient {
  createSession(): Promise<Session>;
  getRecipients(): Promise<Recipient[]>;
  createQuote(input: CreateQuoteInput): Promise<Quote>;
  createTransfer(input: CreateTransferInput, idempotencyKey: string): Promise<TransferSnapshot>;
  getTransfer(id: string): Promise<TransferSnapshot>;
  simulateFunding(id: string, idempotencyKey: string): Promise<TransferSnapshot>;
  advance(id: string): Promise<TransferSnapshot>;
  retryPayout(id: string, idempotencyKey: string): Promise<TransferSnapshot>;
}
```

`lib/api/real.ts`:

```ts
import type { z } from "zod";
import type { ApiClient } from "./client";
import { ApiError, NetworkError } from "./errors";
import { envelope, ErrorEnvelopeSchema, QuoteSchema, RecipientsSchema, SessionSchema, TransferSnapshotSchema } from "./types";

const SESSION_PATH = "/api/demo/session";

export type SchemaMismatchReporter = (endpoint: string, issues: string[]) => void;

export function createRealClient(
  opts: { fetchImpl?: typeof fetch; onSchemaMismatch?: SchemaMismatchReporter } = {},
): ApiClient {
  const doFetch: typeof fetch = opts.fetchImpl ?? ((input, init) => fetch(input, init));
  const report = opts.onSchemaMismatch ?? (() => {});

  async function request<S extends z.ZodType>(
    method: "GET" | "POST",
    path: string,
    schema: S,
    body?: unknown,
    idempotencyKey?: string,
    retried = false,
  ): Promise<z.infer<S>> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (method === "POST") headers["Content-Type"] = "application/json";
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

    let res: Response;
    try {
      res = await doFetch(path, {
        method,
        headers,
        credentials: "same-origin",
        body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      });
    } catch (cause) {
      throw new NetworkError(path, cause);
    }

    const json: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const parsed = ErrorEnvelopeSchema.safeParse(json);
      const e = parsed.success ? parsed.data.error : null;
      const error = new ApiError({
        status: res.status,
        code: e?.code ?? "INTERNAL_ERROR",
        message: e?.message ?? `HTTP ${res.status}`,
        retryable: e?.retryable ?? res.status >= 500,
        fieldErrors: e?.fieldErrors ?? {},
        requestId: parsed.success ? (parsed.data.meta?.requestId ?? null) : null,
        retryAfterSeconds: Number(res.headers.get("Retry-After")) || null,
      });
      if (error.code === "UNAUTHENTICATED" && !retried && path !== SESSION_PATH) {
        await request("POST", SESSION_PATH, SessionSchema, {}, undefined, true);
        return request(method, path, schema, body, idempotencyKey, true);
      }
      throw error;
    }

    const parsed = envelope(schema).safeParse(json);
    if (!parsed.success) {
      report(`${method} ${path}`, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
      return (json as { data: z.infer<S> }).data;
    }
    return parsed.data.data as z.infer<S>;
  }

  const t = (id: string) => encodeURIComponent(id);

  return {
    createSession: () => request("POST", SESSION_PATH, SessionSchema, {}),
    getRecipients: async () => (await request("GET", "/api/recipients", RecipientsSchema)).recipients,
    createQuote: (input) => request("POST", "/api/quotes", QuoteSchema, input),
    createTransfer: (input, key) => request("POST", "/api/transfers", TransferSnapshotSchema, input, key),
    getTransfer: (id) => request("GET", `/api/transfers/${t(id)}`, TransferSnapshotSchema),
    simulateFunding: (id, key) => request("POST", `/api/demo/transfers/${t(id)}/funding`, TransferSnapshotSchema, {}, key),
    advance: (id) => request("POST", `/api/demo/transfers/${t(id)}/advance`, TransferSnapshotSchema, {}),
    retryPayout: (id, key) => request("POST", `/api/demo/transfers/${t(id)}/payout-retry`, TransferSnapshotSchema, {}, key),
  };
}
```

`lib/api/index.ts`:

```ts
import type { ApiClient } from "./client";
import type { Quote } from "./types";

export const ENDPOINT_GROUPS = ["session", "recipients", "quotes", "transfers"] as const;
export type EndpointGroup = (typeof ENDPOINT_GROUPS)[number];
export type EndpointModes = Record<EndpointGroup, "real" | "mock">;

export interface QuoteMemory {
  rememberQuote(quote: Quote): void;
}

export function parseRealEndpoints(raw: string | undefined): EndpointModes {
  const set = new Set((raw ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
  const all = set.has("all");
  return Object.fromEntries(
    ENDPOINT_GROUPS.map((g) => [g, all || set.has(g) ? "real" : "mock"]),
  ) as EndpointModes;
}

/** Real and mock per endpoint group. Flip quotes to real before transfers. */
export function createRoutedClient(modes: EndpointModes, real: ApiClient, mock: ApiClient & QuoteMemory): ApiClient {
  const pick = (g: EndpointGroup) => (modes[g] === "real" ? real : mock);
  return {
    createSession: () => pick("session").createSession(),
    getRecipients: () => pick("recipients").getRecipients(),
    createQuote: async (input) => {
      const quote = await pick("quotes").createQuote(input);
      mock.rememberQuote(quote);
      return quote;
    },
    createTransfer: (input, key) => pick("transfers").createTransfer(input, key),
    getTransfer: (id) => pick("transfers").getTransfer(id),
    simulateFunding: (id, key) => pick("transfers").simulateFunding(id, key),
    advance: (id) => pick("transfers").advance(id),
    retryPayout: (id, key) => pick("transfers").retryPayout(id, key),
  };
}
```

`lib/i18n/errorText.ts`:

```ts
import { ApiError, NetworkError } from "../api/errors";
import type { TFn } from "./translate";

export function errorText(e: unknown, t: TFn): string {
  if (e instanceof NetworkError) return t("error.network");
  if (e instanceof ApiError) {
    if (e.code === "RATE_LIMITED" || e.code === "DEMO_BUDGET_EXCEEDED") return t("error.rateLimited");
    return t("error.generic", { id: e.requestId ?? e.code });
  }
  return t("error.generic", { id: "-" });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/idempotency.test.ts lib/api/real.test.ts lib/api/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts lib/idempotency.ts lib/idempotency.test.ts lib/api lib/i18n/errorText.ts
git commit -m "feat(web): real API client, per-endpoint routing and idempotency keys"
```

---

### Task 7: Contract-faithful mock backend and ntfy notifier

**Files:**
- Create: `lib/api/mock.ts`, `lib/notify.ts`
- Test: `lib/api/mock.test.ts`, `lib/notify.test.ts`

**Interfaces:**
- Consumes: `ApiClient`, `QuoteMemory`, `ApiError`, `KeyValueStore`/`memoryStore`, `estimateQuote`/`FIXTURE`/`formatMinor`.
- Produces:
  - `type NotifyResult = "SENT" | "FAILED" | "NOT_SENT"`, `type Notifier = (s: TransferSnapshot) => Promise<NotifyResult>`
  - `MOCK_RECIPIENT: Recipient`
  - `type MockClient = ApiClient & QuoteMemory & { reset(): void }`
  - `createMockClient(opts?: { storage?: KeyValueStore; now?: () => Date; notify?: Notifier; delayMs?: number }): MockClient`
  - `ntfyNotifier(topic: string | undefined, fetchImpl?: typeof fetch): Notifier`, `notificationText(s: TransferSnapshot): string`

- [ ] **Step 1: Write the failing tests**

`lib/api/mock.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { memoryStore } from "../storage";
import { ApiError } from "./errors";
import { createMockClient, MOCK_RECIPIENT } from "./mock";
import type { DemoScenario, TransferSnapshot } from "./types";

async function start(scenario: DemoScenario = "HAPPY_PATH", opts: Parameters<typeof createMockClient>[0] = {}) {
  const api = createMockClient(opts);
  const quote = await api.createQuote({ recipientId: MOCK_RECIPIENT.id, sourceDebitMinor: "1000" });
  const created = await api.createTransfer({ quoteId: quote.id, purpose: "PERSONAL_REMITTANCE", demoScenario: scenario }, "k-create");
  return { api, quote, created };
}

async function runToRest(api: ReturnType<typeof createMockClient>, id: string) {
  const seen: TransferSnapshot[] = [];
  let s = await api.getTransfer(id);
  for (let i = 0; i < 20 && s.nextAction === "ADVANCE"; i++) {
    s = await api.advance(id);
    seen.push(s);
  }
  return { last: s, seen };
}

describe("mock backend", () => {
  it("quotes with fixture arithmetic and mock settlement mode", async () => {
    const { quote } = await start();
    expect(quote).toMatchObject({ feeMinor: "20", destinationNetMinor: "34300", settlementMode: "MOCK" });
  });

  it("runs the happy path in contract order and notifies once", async () => {
    const notify = vi.fn().mockResolvedValue("SENT");
    const { api, created } = await start("HAPPY_PATH", { notify });
    expect(created).toMatchObject({ status: "FUNDING_PENDING", version: 1, nextAction: "SIMULATE_FUNDING" });
    await api.simulateFunding(created.id, "k-fund");
    const { last, seen } = await runToRest(api, created.id);
    expect(seen.map((s) => s.status)).toEqual([
      "SETTLEMENT_PENDING", "SETTLEMENT_PENDING", "SETTLED", "PAYOUT_PENDING", "COMPLETED_SIMULATED",
    ]);
    expect(last.settlement).toMatchObject({ mode: "MOCK", status: "CONFIRMED", explorerUrl: null });
    expect(last.settlement.txHash).toMatch(/^mock-0x[0-9a-f]{64}$/);
    expect(last.receipt).not.toBeNull();
    expect(last.notification).toEqual({ channel: "NTFY", status: "SENT" });
    expect(notify).toHaveBeenCalledTimes(1);
    const versions = seen.map((s) => s.version);
    expect([...versions].sort((a, b) => a - b)).toEqual(versions);
  });

  it("stops at FUNDING_FAILED when funding is declined", async () => {
    const { api, created } = await start("FUNDING_DECLINED");
    const s = await api.simulateFunding(created.id, "k-fund");
    expect(s).toMatchObject({ status: "FUNDING_FAILED", nextAction: "NONE", funding: { status: "DECLINED" } });
    expect(s.settlement.txHash).toBeNull();
  });

  it("fails payout once, then retry completes without a new settlement", async () => {
    const { api, created } = await start("PAYOUT_FAILED");
    await api.simulateFunding(created.id, "k-fund");
    const failed = (await runToRest(api, created.id)).last;
    expect(failed).toMatchObject({ status: "PAYOUT_FAILED", nextAction: "RETRY_PAYOUT" });
    const hash = failed.settlement.txHash;
    await api.retryPayout(created.id, "k-retry");
    const done = (await runToRest(api, created.id)).last;
    expect(done.status).toBe("COMPLETED_SIMULATED");
    expect(done.settlement.txHash).toBe(hash);
  });

  it("replays createTransfer with the same key", async () => {
    const { api, quote, created } = await start();
    const again = await api.createTransfer({ quoteId: quote.id, purpose: "PERSONAL_REMITTANCE", demoScenario: "HAPPY_PATH" }, "k-create");
    expect(again.id).toBe(created.id);
    const conflict = await api
      .createTransfer({ quoteId: quote.id, purpose: "PERSONAL_REMITTANCE", demoScenario: "PAYOUT_FAILED" }, "k-create")
      .catch((e) => e);
    expect(conflict).toBeInstanceOf(ApiError);
    expect(conflict.code).toBe("IDEMPOTENCY_CONFLICT");
    const otherKey = await api
      .createTransfer({ quoteId: quote.id, purpose: "PERSONAL_REMITTANCE", demoScenario: "HAPPY_PATH" }, "k-other")
      .catch((e) => e);
    expect(otherKey.code).toBe("QUOTE_ALREADY_ACCEPTED");
  });

  it("replays simulateFunding with the same key", async () => {
    const { api, created } = await start();
    const first = await api.simulateFunding(created.id, "k-fund");
    const second = await api.simulateFunding(created.id, "k-fund");
    expect(second.version).toBe(first.version);
    expect(second.funding.reference).toBe(first.funding.reference);
    const newKey = await api.simulateFunding(created.id, "k-fund-2").catch((e) => e);
    expect(newKey.code).toBe("INVALID_STATE");
  });

  it("rejects an expired quote with 410", async () => {
    let now = new Date("2026-10-16T10:00:00Z");
    const api = createMockClient({ now: () => now });
    const quote = await api.createQuote({ recipientId: MOCK_RECIPIENT.id, sourceDebitMinor: "1000" });
    now = new Date("2026-10-16T10:05:01Z");
    const err = await api
      .createTransfer({ quoteId: quote.id, purpose: "PERSONAL_REMITTANCE", demoScenario: "HAPPY_PATH" }, "k")
      .catch((e) => e);
    expect(err).toMatchObject({ status: 410, code: "QUOTE_EXPIRED" });
  });

  it("rejects out-of-range amounts with field errors", async () => {
    const api = createMockClient();
    const err = await api.createQuote({ recipientId: MOCK_RECIPIENT.id, sourceDebitMinor: "10001" }).catch((e) => e);
    expect(err).toMatchObject({ status: 400, code: "INVALID_INPUT" });
    expect(err.fieldErrors.sourceDebitMinor).toBeTruthy();
  });

  it("persists across clients sharing storage and resets", async () => {
    const storage = memoryStore();
    const { created } = await start("HAPPY_PATH", { storage });
    const reopened = createMockClient({ storage });
    expect((await reopened.getTransfer(created.id)).id).toBe(created.id);
    reopened.reset();
    const gone = await createMockClient({ storage }).getTransfer(created.id).catch((e) => e);
    expect(gone.code).toBe("NOT_FOUND");
  });
});
```

`lib/notify.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { snapshotWith } from "./api/fixtures";
import { notificationText, ntfyNotifier } from "./notify";

describe("ntfy notifier", () => {
  it("does nothing without a topic", async () => {
    const fetchImpl = vi.fn();
    expect(await ntfyNotifier(undefined, fetchImpl)(snapshotWith({ status: "COMPLETED_SIMULATED" }))).toBe("NOT_SENT");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts an honest message to the topic", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const s = snapshotWith({ status: "COMPLETED_SIMULATED", settlement: { mode: "MOCK" } });
    expect(await ntfyNotifier("centme-abc", fetchImpl)(s)).toBe("SENT");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://ntfy.sh/centme-abc");
    expect(init.body).toBe("[MOCK] Demo Recipient received ฿343.00 · THB payout simulated.");
  });

  it("describes real testnet settlement without the mock prefix", () => {
    expect(notificationText(snapshotWith({ status: "COMPLETED_SIMULATED" }))).toBe(
      "Demo Recipient received ฿343.00 · USDC settled on Avalanche Fuji · THB payout simulated.",
    );
  });

  it("reports FAILED instead of throwing", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("offline"));
    expect(await ntfyNotifier("t", fetchImpl)(snapshotWith({ status: "COMPLETED_SIMULATED" }))).toBe("FAILED");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/api/mock.test.ts lib/notify.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`lib/notify.ts`:

```ts
import type { TransferSnapshot } from "./api/types";
import { formatMinor } from "./money";

export type NotifyResult = "SENT" | "FAILED" | "NOT_SENT";
export type Notifier = (s: TransferSnapshot) => Promise<NotifyResult>;

export function notificationText(s: TransferSnapshot): string {
  const amount = formatMinor(s.amounts.destinationNetMinor, "THB");
  return s.settlement.mode === "MOCK"
    ? `[MOCK] ${s.recipient.name} received ${amount} · THB payout simulated.`
    : `${s.recipient.name} received ${amount} · USDC settled on Avalanche Fuji · THB payout simulated.`;
}

/** Browser-side push for mock mode. Synthetic data only: ntfy.sh topics are public. */
export function ntfyNotifier(
  topic: string | undefined,
  fetchImpl: typeof fetch = (input, init) => fetch(input, init),
): Notifier {
  return async (s) => {
    if (!topic) return "NOT_SENT";
    try {
      const res = await fetchImpl(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
        method: "POST",
        body: notificationText(s),
        headers: { Title: "CentMe", Tags: "moneybag" },
      });
      return res.ok ? "SENT" : "FAILED";
    } catch {
      return "FAILED";
    }
  };
}
```

`lib/api/mock.ts`:

```ts
import { estimateQuote, FIXTURE } from "../money";
import type { NotifyResult, Notifier } from "../notify";
import { memoryStore, type KeyValueStore } from "../storage";
import type { ApiClient } from "./client";
import { ApiError } from "./errors";
import type { QuoteMemory } from "./index";
import type { Quote, Recipient, TransferSnapshot, TransferStatus } from "./types";

const STORAGE_KEY = "centme:mock:v1";
const QUOTE_TTL_MS = 300_000;
const TOKEN_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";

export const MOCK_RECIPIENT: Recipient = {
  id: "recipient_demo_th_001",
  name: "Demo Recipient",
  country: "TH",
  currency: "THB",
  bankLabel: "Demo Thai Bank",
  accountDisplay: "TEST ACCOUNT 0001",
  isSynthetic: true,
};

type QuoteRecord = { quote: Quote; state: "OPEN" | "ACCEPTED" };
type KeyRecord = { fingerprint: string; transferId: string };
type TransferRecord = { snapshot: TransferSnapshot; payoutAttempts: number };
type MockState = {
  counter: number;
  quotes: Record<string, QuoteRecord>;
  transfers: Record<string, TransferRecord>;
  keys: Record<string, KeyRecord>;
};

export type MockClient = ApiClient & QuoteMemory & { reset(): void };

const emptyState = (): MockState => ({ counter: 0, quotes: {}, transfers: {}, keys: {} });

function mockHash(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return "mock-0x" + Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export function createMockClient(
  opts: { storage?: KeyValueStore; now?: () => Date; notify?: Notifier; delayMs?: number } = {},
): MockClient {
  const storage = opts.storage ?? memoryStore();
  const now = opts.now ?? (() => new Date());
  const notify: Notifier = opts.notify ?? (async () => "NOT_SENT");
  const delayMs = opts.delayMs ?? 0;

  let state: MockState = (() => {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as MockState;
    } catch {
      // corrupt mock data: start fresh
    }
    return emptyState();
  })();

  const save = () => storage.setItem(STORAGE_KEY, JSON.stringify(state));
  const nextId = (prefix: string) => `${prefix}_${++state.counter}`;
  const iso = () => now().toISOString();
  const clone = <T>(v: T): T => structuredClone(v);
  const fail = (status: number, code: string, message: string, fieldErrors: Record<string, string> = {}) =>
    new ApiError({ status, code, message, retryable: false, fieldErrors, requestId: `mock_req_${state.counter}`, retryAfterSeconds: null });

  function record(id: string): TransferRecord {
    const r = state.transfers[id];
    if (!r) throw fail(404, "NOT_FOUND", "Transfer not found.");
    return r;
  }

  function transition(r: TransferRecord, status: TransferStatus, patch: Partial<TransferSnapshot>) {
    const s = r.snapshot;
    const at = iso();
    r.snapshot = {
      ...s,
      ...patch,
      status,
      version: s.version + 1,
      updatedAt: at,
      events: [...s.events, { sequence: s.events.length + 1, status, createdAt: at }],
    };
    save();
  }

  /** Snapshot changes without a status change still bump the version. */
  function patchOnly(r: TransferRecord, patch: Partial<TransferSnapshot>) {
    r.snapshot = { ...r.snapshot, ...patch, version: r.snapshot.version + 1, updatedAt: iso() };
    save();
  }

  function replay(key: string, fingerprint: string): TransferSnapshot | null {
    const k = state.keys[key];
    if (!k) return null;
    if (k.fingerprint !== fingerprint) throw fail(409, "IDEMPOTENCY_CONFLICT", "This request key was already used with different input.");
    return clone(record(k.transferId).snapshot);
  }

  return {
    async createSession() {
      return { sessionId: "mock_session", mode: "DEMO", expiresAt: new Date(now().getTime() + 86_400_000).toISOString() };
    },

    async getRecipients() {
      return [clone(MOCK_RECIPIENT)];
    },

    async createQuote({ recipientId, sourceDebitMinor }) {
      if (recipientId !== MOCK_RECIPIENT.id) throw fail(404, "NOT_FOUND", "Recipient not found.");
      if (!/^[1-9]\d*$/.test(sourceDebitMinor)) {
        throw fail(400, "INVALID_INPUT", "Invalid amount.", { sourceDebitMinor: "Use whole cents." });
      }
      const debit = BigInt(sourceDebitMinor);
      if (debit < FIXTURE.minDebitMinor || debit > FIXTURE.maxDebitMinor) {
        throw fail(400, "INVALID_INPUT", "Amount out of range.", { sourceDebitMinor: "USD 1.00 to 100.00 only." });
      }
      const created = now();
      const quote: Quote = {
        id: nextId("mock_quote"),
        recipientId,
        sourceCountry: "US",
        destinationCountry: "TH",
        sourceCurrency: "USD",
        destinationCurrency: "THB",
        ...estimateQuote(sourceDebitMinor),
        fxRateNumerator: FIXTURE.rateNumerator.toString(),
        fxRateDenominator: FIXTURE.rateDenominator.toString(),
        fixtureVersion: FIXTURE.version,
        createdAt: created.toISOString(),
        expiresAt: new Date(created.getTime() + QUOTE_TTL_MS).toISOString(),
        mode: "DEMO",
        fundingSimulated: true,
        fxSimulated: true,
        payoutSimulated: true,
        settlementMode: "MOCK",
        chainId: 43113,
        arrivalEstimate: null,
      };
      state.quotes[quote.id] = { quote, state: "OPEN" };
      save();
      return clone(quote);
    },

    rememberQuote(quote) {
      if (state.quotes[quote.id]) return;
      state.quotes[quote.id] = { quote: clone(quote), state: "OPEN" };
      save();
    },

    async createTransfer(input, key) {
      const fingerprint = `${input.quoteId}|${input.purpose}|${input.demoScenario}`;
      const replayed = replay(`create:${key}`, fingerprint);
      if (replayed) return replayed;
      const q = state.quotes[input.quoteId];
      if (!q) throw fail(404, "NOT_FOUND", "Quote not found.");
      if (q.state === "ACCEPTED") throw fail(409, "QUOTE_ALREADY_ACCEPTED", "This quote was already used.");
      if (now().getTime() > Date.parse(q.quote.expiresAt)) throw fail(410, "QUOTE_EXPIRED", "This quote has expired.");

      const at = iso();
      const id = nextId("mock_transfer");
      const snapshot: TransferSnapshot = {
        id,
        quoteId: q.quote.id,
        status: "FUNDING_PENDING",
        version: 1,
        mode: "DEMO",
        purpose: input.purpose,
        demoScenario: input.demoScenario,
        recipient: {
          id: MOCK_RECIPIENT.id,
          name: MOCK_RECIPIENT.name,
          bankLabel: MOCK_RECIPIENT.bankLabel,
          accountDisplay: MOCK_RECIPIENT.accountDisplay,
          isSynthetic: true,
        },
        amounts: {
          sourceCurrency: "USD",
          destinationCurrency: "THB",
          sourceDebitMinor: q.quote.sourceDebitMinor,
          feeMinor: q.quote.feeMinor,
          conversionPrincipalMinor: q.quote.conversionPrincipalMinor,
          destinationNetMinor: q.quote.destinationNetMinor,
          settlementTokenUnits: q.quote.settlementTokenUnits,
        },
        funding: { mode: "SIMULATED", status: "PENDING", reference: null },
        fx: {
          mode: "SIMULATED",
          fixtureVersion: q.quote.fixtureVersion,
          rateNumerator: q.quote.fxRateNumerator,
          rateDenominator: q.quote.fxRateDenominator,
        },
        settlement: {
          mode: "MOCK",
          status: "NOT_STARTED",
          chainId: 43113,
          tokenSymbol: "USDC",
          tokenAddress: TOKEN_ADDRESS,
          tokenDecimals: 6,
          txHash: null,
          explorerUrl: null,
          verifiedAt: null,
        },
        payout: { mode: "SIMULATED", status: "NOT_STARTED", reference: null },
        notification: { channel: "NTFY", status: "NOT_SENT" },
        events: [{ sequence: 1, status: "FUNDING_PENDING", createdAt: at }],
        lastIssue: null,
        nextAction: "SIMULATE_FUNDING",
        receipt: null,
        createdAt: at,
        updatedAt: at,
      };
      q.state = "ACCEPTED";
      state.transfers[id] = { snapshot, payoutAttempts: 0 };
      state.keys[`create:${key}`] = { fingerprint, transferId: id };
      save();
      return clone(snapshot);
    },

    async getTransfer(id) {
      return clone(record(id).snapshot);
    },

    async simulateFunding(id, key) {
      const replayed = replay(`funding:${key}`, id);
      if (replayed) return replayed;
      const r = record(id);
      if (r.snapshot.status !== "FUNDING_PENDING") throw fail(409, "INVALID_STATE", "Funding was already processed.");
      const reference = nextId("mock_funding");
      if (r.snapshot.demoScenario === "FUNDING_DECLINED") {
        transition(r, "FUNDING_FAILED", { funding: { mode: "SIMULATED", status: "DECLINED", reference }, nextAction: "NONE" });
      } else {
        transition(r, "FUNDED_SIMULATED", { funding: { mode: "SIMULATED", status: "ACCEPTED", reference }, nextAction: "ADVANCE" });
      }
      state.keys[`funding:${key}`] = { fingerprint: id, transferId: id };
      save();
      return clone(r.snapshot);
    },

    async advance(id) {
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      const r = record(id);
      const s = r.snapshot;
      switch (s.status) {
        case "FUNDED_SIMULATED":
          transition(r, "SETTLEMENT_PENDING", { settlement: { ...s.settlement, status: "PREPARING" }, nextAction: "ADVANCE" });
          break;
        case "SETTLEMENT_PENDING":
          if (s.settlement.status === "PREPARING") {
            patchOnly(r, { settlement: { ...s.settlement, status: "BROADCAST", txHash: mockHash() } });
          } else {
            transition(r, "SETTLED", { settlement: { ...s.settlement, status: "CONFIRMED", verifiedAt: iso() }, nextAction: "ADVANCE" });
          }
          break;
        case "SETTLED":
          r.payoutAttempts += 1;
          transition(r, "PAYOUT_PENDING", {
            payout: { mode: "SIMULATED", status: "PENDING", reference: nextId("mock_payout") },
            nextAction: "ADVANCE",
          });
          break;
        case "PAYOUT_PENDING":
          if (s.demoScenario === "PAYOUT_FAILED" && r.payoutAttempts === 1) {
            transition(r, "PAYOUT_FAILED", { payout: { ...s.payout, status: "FAILED" }, nextAction: "RETRY_PAYOUT" });
          } else {
            transition(r, "COMPLETED_SIMULATED", {
              payout: { ...s.payout, status: "PAID" },
              nextAction: "NONE",
              receipt: { id: nextId("mock_receipt"), issuedAt: iso(), summary: "Demo completed: mock settlement; THB payout simulated." },
            });
            const result: NotifyResult = await notify(clone(r.snapshot)).catch(() => "FAILED" as const);
            if (result !== "NOT_SENT") patchOnly(r, { notification: { channel: "NTFY", status: result } });
          }
          break;
        default:
          break;
      }
      return clone(r.snapshot);
    },

    async retryPayout(id, key) {
      const replayed = replay(`payout:${key}`, id);
      if (replayed) return replayed;
      const r = record(id);
      if (r.snapshot.status !== "PAYOUT_FAILED") throw fail(409, "INVALID_STATE", "Payout is not in a failed state.");
      r.payoutAttempts += 1;
      transition(r, "PAYOUT_PENDING", {
        payout: { mode: "SIMULATED", status: "PENDING", reference: nextId("mock_payout") },
        nextAction: "ADVANCE",
      });
      state.keys[`payout:${key}`] = { fingerprint: id, transferId: id };
      save();
      return clone(r.snapshot);
    },

    reset() {
      state = emptyState();
      storage.removeItem(STORAGE_KEY);
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/api/mock.test.ts lib/notify.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/api/mock.ts lib/api/mock.test.ts lib/notify.ts lib/notify.test.ts
git commit -m "feat(web): contract-faithful mock backend and ntfy notifier"
```

---

### Task 8: Transfer poller and React hook

**Files:**
- Create: `lib/transferPoller.ts`, `lib/useTransfer.ts`
- Test: `lib/transferPoller.test.ts`

**Interfaces:**
- Consumes: `ApiClient`, `TransferSnapshot`, `createMockClient`, `isApiError`; `useApi()` from Task 9 (the hook file is only compiled by the build after Task 9 exists; write it now, it is exercised in Task 12).
- Produces:
  - `type Schedule = (fn: () => void, ms: number) => () => void`
  - `backoffDelay(failures: number): number`
  - `type TransferPoller = { stop(): void; kick(): void; accept(s: TransferSnapshot): void }`
  - `startTransferPoller(id: string, deps: { api: Pick<ApiClient, "getTransfer" | "advance">; onSnapshot(s: TransferSnapshot): void; onError(e: unknown): void; schedule?: Schedule }): TransferPoller`
  - `useTransfer(id: string): { snapshot: TransferSnapshot | null; error: unknown; accept(s): void; kick(): void }`

- [ ] **Step 1: Write the failing test**

`lib/transferPoller.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { snapshotWith } from "./api/fixtures";
import { createMockClient, MOCK_RECIPIENT } from "./api/mock";
import type { TransferSnapshot } from "./api/types";
import { backoffDelay, startTransferPoller, type Schedule } from "./transferPoller";

const flush = () => new Promise((r) => setTimeout(r, 0));

function manualSchedule() {
  const queue: { fn: () => void; ms: number }[] = [];
  const schedule: Schedule = (fn, ms) => {
    const item = { fn, ms };
    queue.push(item);
    return () => {
      const i = queue.indexOf(item);
      if (i >= 0) queue.splice(i, 1);
    };
  };
  return {
    schedule,
    queue,
    async runNext() {
      const item = queue.shift();
      item?.fn();
      await flush();
      return item?.ms;
    },
  };
}

describe("transfer poller", () => {
  it("backoff doubles from 2s and caps at 10s", () => {
    expect([0, 1, 2, 3, 4].map(backoffDelay)).toEqual([2000, 4000, 8000, 10000, 10000]);
  });

  it("drives the mock happy path to completion", async () => {
    const api = createMockClient();
    const quote = await api.createQuote({ recipientId: MOCK_RECIPIENT.id, sourceDebitMinor: "1000" });
    const t = await api.createTransfer({ quoteId: quote.id, purpose: "PERSONAL_REMITTANCE", demoScenario: "HAPPY_PATH" }, "k");
    await api.simulateFunding(t.id, "f");
    const seen: TransferSnapshot[] = [];
    const clock = manualSchedule();
    startTransferPoller(t.id, { api, onSnapshot: (s) => seen.push(s), onError: () => {}, schedule: clock.schedule });
    await flush();
    for (let i = 0; i < 20 && clock.queue.length; i++) await clock.runNext();
    expect(seen.at(-1)?.status).toBe("COMPLETED_SIMULATED");
    expect(clock.queue).toHaveLength(0); // stops on NONE
  });

  it("ignores snapshots older than the latest version", async () => {
    const newer = snapshotWith({ status: "SETTLED", version: 5, nextAction: "ADVANCE" });
    const older = snapshotWith({ status: "SETTLEMENT_PENDING", version: 3, nextAction: "ADVANCE" });
    const api = { getTransfer: vi.fn().mockResolvedValueOnce(newer).mockResolvedValue(older), advance: vi.fn().mockResolvedValue(older) };
    const seen: number[] = [];
    const clock = manualSchedule();
    startTransferPoller("t", { api, onSnapshot: (s) => seen.push(s.version), onError: () => {}, schedule: clock.schedule });
    await flush();
    await clock.runNext();
    expect(seen).toEqual([5]);
  });

  it("backs off on errors and resets after success", async () => {
    const done = snapshotWith({ status: "COMPLETED_SIMULATED", nextAction: "NONE" });
    const api = {
      getTransfer: vi.fn()
        .mockRejectedValueOnce(new Error("down"))
        .mockRejectedValueOnce(new Error("down"))
        .mockRejectedValueOnce(new Error("down"))
        .mockResolvedValue(done),
      advance: vi.fn(),
    };
    const errors: unknown[] = [];
    const clock = manualSchedule();
    startTransferPoller("t", { api, onSnapshot: () => {}, onError: (e) => errors.push(e), schedule: clock.schedule });
    await flush();
    const delays: number[] = [];
    for (let i = 0; i < 5 && clock.queue.length; i++) delays.push((await clock.runNext())!);
    expect(delays).toEqual([4000, 8000, 10000]);
    expect(errors).toHaveLength(3);
    expect(clock.queue).toHaveLength(0);
    expect(api.advance).not.toHaveBeenCalled();
  });

  it("stop cancels the next tick; kick restarts an idle poller", async () => {
    const pending = snapshotWith({ status: "FUNDING_PENDING", nextAction: "SIMULATE_FUNDING" });
    const api = { getTransfer: vi.fn().mockResolvedValue(pending), advance: vi.fn() };
    const clock = manualSchedule();
    const poller = startTransferPoller("t", { api, onSnapshot: () => {}, onError: () => {}, schedule: clock.schedule });
    await flush();
    expect(clock.queue).toHaveLength(0); // idle: waiting for funding
    poller.kick();
    await flush();
    expect(api.getTransfer).toHaveBeenCalledTimes(2);
    poller.stop();
    poller.kick();
    await flush();
    expect(api.getTransfer).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/transferPoller.test.ts`
Expected: FAIL, cannot resolve `./transferPoller`.

- [ ] **Step 3: Implement**

`lib/transferPoller.ts`:

```ts
import type { ApiClient } from "./api/client";
import type { TransferSnapshot } from "./api/types";

export type Schedule = (fn: () => void, ms: number) => () => void;

const defaultSchedule: Schedule = (fn, ms) => {
  const id = setTimeout(fn, ms);
  return () => clearTimeout(id);
};

export const BASE_DELAY_MS = 2000;
export const MAX_DELAY_MS = 10000;

export function backoffDelay(failures: number): number {
  return Math.min(BASE_DELAY_MS * 2 ** failures, MAX_DELAY_MS);
}

export type TransferPoller = { stop(): void; kick(): void; accept(s: TransferSnapshot): void };

/**
 * Reads the transfer, calls advance only while nextAction is ADVANCE, one request in flight.
 * Goes idle on any other nextAction; kick() resumes after a user action (funding, payout retry).
 */
export function startTransferPoller(
  id: string,
  deps: {
    api: Pick<ApiClient, "getTransfer" | "advance">;
    onSnapshot(s: TransferSnapshot): void;
    onError(e: unknown): void;
    schedule?: Schedule;
  },
): TransferPoller {
  const schedule = deps.schedule ?? defaultSchedule;
  let latest: TransferSnapshot | null = null;
  let stopped = false;
  let running = false;
  let failures = 0;
  let cancel: (() => void) | null = null;

  function accept(s: TransferSnapshot) {
    if (latest && s.version < latest.version) return;
    latest = s;
    deps.onSnapshot(s);
  }

  async function tick() {
    cancel = null;
    if (stopped || running) return;
    running = true;
    try {
      accept(await deps.api.getTransfer(id));
      if (latest?.nextAction === "ADVANCE") accept(await deps.api.advance(id));
      failures = 0;
    } catch (e) {
      failures += 1;
      deps.onError(e);
    } finally {
      running = false;
    }
    if (stopped) return;
    if (failures > 0 || latest?.nextAction === "ADVANCE") cancel = schedule(tick, backoffDelay(failures));
  }

  void tick();

  return {
    stop() {
      stopped = true;
      cancel?.();
      cancel = null;
    },
    kick() {
      if (stopped) return;
      cancel?.();
      cancel = null;
      void tick();
    },
    accept,
  };
}
```

`lib/useTransfer.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "./api/ApiProvider";
import { isApiError } from "./api/errors";
import type { TransferSnapshot } from "./api/types";
import { startTransferPoller, type TransferPoller } from "./transferPoller";

export function useTransfer(id: string) {
  const { api } = useApi();
  const [snapshot, setSnapshot] = useState<TransferSnapshot | null>(null);
  const [error, setError] = useState<unknown>(null);
  const pollerRef = useRef<TransferPoller | null>(null);

  useEffect(() => {
    const poller = startTransferPoller(id, {
      api,
      onSnapshot: (s) => {
        setSnapshot(s);
        setError(null);
      },
      onError: (e) => {
        setError(e);
        if (isApiError(e, "NOT_FOUND")) pollerRef.current?.stop();
      },
    });
    pollerRef.current = poller;
    return () => poller.stop();
  }, [api, id]);

  const accept = useCallback((s: TransferSnapshot) => pollerRef.current?.accept(s), []);
  const kick = useCallback(() => pollerRef.current?.kick(), []);

  return { snapshot, error, accept, kick };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/transferPoller.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS, all test files.

- [ ] **Step 6: Commit**

```bash
git add lib/transferPoller.ts lib/transferPoller.test.ts lib/useTransfer.ts
git commit -m "feat(web): single-flight transfer poller with backoff"
```

---

### Task 9: App shell, tokens, providers and shared UI pieces

**Files:**
- Modify (full replace): `app/globals.css`, `app/layout.tsx`
- Create: `app/providers.tsx`, `lib/api/ApiProvider.tsx`, `components/brand/Logo.tsx`, `components/shell/Header.tsx`, `components/shell/MockBanner.tsx`, `components/common/SummaryRow.tsx`, `components/common/EvidenceTag.tsx`

**Interfaces:**
- Consumes: `createMockClient`, `createRealClient`, `createRoutedClient`, `parseRealEndpoints`, `ntfyNotifier`, `browserStorage`, `LanguageProvider`, `useT`, `EvidenceTagKind`.
- Produces: `useApi(): { api: ApiClient; modes: EndpointModes; resetMock(): void }`, `<Logo />`, `<SummaryRow label value strong? />`, `<EvidenceTag tag />`, CSS tokens `bg-brand`, `text-brand`, `text-pending`, `bg-pending/10`, `font-mono`, class `tabular`.

- [ ] **Step 1: Load the design skill**

Invoke the `impeccable` skill in `craft` mode with spec sections 2–4 (screens, ease-of-use rules, visual style) as the brief. Apply its guidance to this task and Tasks 10–12; keep the tokens below as the source of truth. Do not invoke `ui-ux-pro-max` in the same request.

- [ ] **Step 2: Replace `app/globals.css`**

```css
@import "tailwindcss";
@import "tw-animate-css";

:root {
  --radius: 0.75rem;
  --background: #f5faf6;
  --foreground: #0b2318;
  --card: #ffffff;
  --card-foreground: #0b2318;
  --popover: #ffffff;
  --popover-foreground: #0b2318;
  --primary: #9be15d;
  --primary-foreground: #0b2318;
  --secondary: #e7f2ea;
  --secondary-foreground: #0b2318;
  --muted: #eef5f0;
  --muted-foreground: #4a5d53;
  --accent: #e7f2ea;
  --accent-foreground: #0b2318;
  --destructive: #dc2626;
  --border: #d7e5dc;
  --input: #c9dbcf;
  --ring: #0f5132;
  --brand: #0f5132;
  --pending: #b45309;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-brand: var(--brand);
  --color-pending: var(--pending);
  --font-sans: var(--font-plex), var(--font-plex-thai), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-plex-mono), ui-monospace, monospace;
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
  .tabular {
    font-variant-numeric: tabular-nums;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 3: API provider**

`lib/api/ApiProvider.tsx`:

```tsx
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ntfyNotifier } from "../notify";
import { browserStorage } from "../storage";
import type { ApiClient } from "./client";
import { createRoutedClient, parseRealEndpoints, type EndpointModes } from "./index";
import { createMockClient } from "./mock";
import { createRealClient } from "./real";

type ApiContextValue = { api: ApiClient; modes: EndpointModes; resetMock(): void };

const ApiContext = createContext<ApiContextValue | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const [value] = useState<ApiContextValue>(() => {
    const modes = parseRealEndpoints(process.env.NEXT_PUBLIC_REAL_ENDPOINTS);
    const mock = createMockClient({
      storage: browserStorage("local"),
      notify: ntfyNotifier(process.env.NEXT_PUBLIC_NTFY_TOPIC),
      delayMs: 900,
    });
    const real = createRealClient({
      onSchemaMismatch: (endpoint, issues) => {
        console.error(`[CentMe] contract mismatch on ${endpoint}`, issues);
        if (process.env.NODE_ENV !== "production") toast.error(`${endpoint}: ${issues[0] ?? "schema mismatch"}`);
      },
    });
    return { api: createRoutedClient(modes, real, mock), modes, resetMock: () => mock.reset() };
  });

  useEffect(() => {
    value.api.createSession().catch(() => {
      // 401 handling in the real client re-creates the session on the next call
    });
  }, [value]);

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiContextValue {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApi must be used inside <ApiProvider>");
  return ctx;
}
```

`app/providers.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { ApiProvider } from "@/lib/api/ApiProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <ApiProvider>{children}</ApiProvider>
    </LanguageProvider>
  );
}
```

- [ ] **Step 4: Brand, header, banner, shared pieces**

`components/brand/Logo.tsx`:

```tsx
/** Placeholder until the real logo arrives; swap this file only. */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
      <span aria-hidden className="grid size-8 place-items-center rounded-full bg-primary text-lg font-bold text-foreground">
        ¢
      </span>
      CentMe
    </span>
  );
}
```

`components/shell/Header.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/LanguageProvider";

export function Header() {
  const { t, lang, setLang } = useT();
  return (
    <header className="border-b bg-card">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        {t("header.skip")}
      </a>
      <div className="mx-auto flex h-16 w-full max-w-[1040px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-pending/40 bg-pending/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-pending">
            {t("header.testMode")}
          </span>
          <Button variant="ghost" onClick={() => setLang(lang === "en" ? "th" : "en")} aria-label={t("header.langAria")}>
            {t("header.langToggle")}
          </Button>
        </div>
      </div>
    </header>
  );
}
```

`components/shell/MockBanner.tsx`:

```tsx
"use client";

import { useApi } from "@/lib/api/ApiProvider";
import { useT } from "@/lib/i18n/LanguageProvider";

export function MockBanner() {
  const { modes } = useApi();
  const { t } = useT();
  if (!Object.values(modes).includes("mock")) return null;
  return (
    <div role="note" className="border-b border-dashed border-pending/50 bg-pending/10 px-4 py-2 text-center text-sm font-medium text-pending">
      {t("header.mockData")}
    </div>
  );
}
```

`components/common/SummaryRow.tsx`:

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SummaryRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("tabular min-w-0 text-right", strong ? "text-base font-semibold" : "font-medium")}>{value}</dd>
    </div>
  );
}
```

`components/common/EvidenceTag.tsx`:

```tsx
"use client";

import { useT } from "@/lib/i18n/LanguageProvider";
import type { EvidenceTagKind } from "@/lib/status";
import { cn } from "@/lib/utils";

const STYLE: Record<EvidenceTagKind, string> = {
  SIMULATED: "border-dashed border-muted-foreground/60 text-muted-foreground",
  TESTNET: "border-solid border-brand text-brand",
  MOCK: "border-dashed border-pending text-pending",
};

export function EvidenceTag({ tag }: { tag: EvidenceTagKind }) {
  const { t } = useT();
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide", STYLE[tag])}>
      {t(`tag.${tag}` as const)}
    </span>
  );
}
```

- [ ] **Step 5: Replace `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Thai } from "next/font/google";
import { Header } from "@/components/shell/Header";
import { MockBanner } from "@/components/shell/MockBanner";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex", display: "swap" });
const plexThai = IBM_Plex_Sans_Thai({ subsets: ["thai"], weight: ["400", "500", "600", "700"], variable: "--font-plex-thai", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  title: "CentMe",
  description: "Send USD to Thailand. Test-mode demo: USD funding and THB payout are simulated.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plex.variable} ${plexThai.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh">
        <Providers>
          <Header />
          <MockBanner />
          <main id="main" className="mx-auto w-full max-w-[1040px] px-4 py-8 sm:px-6 lg:py-12">
            {children}
          </main>
        </Providers>
        <Toaster theme="light" richColors position="top-center" />
      </body>
    </html>
  );
}
```

Replace `app/page.tsx` temporarily with `export default function Home() { return null; }` so the build passes before Task 10.

- [ ] **Step 6: Verify**

Run: `npm test && npm run build`
Expected: tests PASS; build succeeds.

Run: `npm run dev`, open `http://localhost:3000`.
Expected: white header with lime ¢ CentMe, amber `TEST MODE` pill, `ภาษาไทย` button (toggles to Thai and back, survives refresh), dashed amber MOCK DATA banner, mint page background. Tab once: "Skip to content" appears.

- [ ] **Step 7: Commit**

```bash
git add app components lib/api/ApiProvider.tsx
git commit -m "feat(web): CentMe shell, tokens, fonts and providers"
```

---

### Task 10: Screen 1 — Send

**Files:**
- Modify (full replace): `app/page.tsx`
- Create: `components/send/AmountField.tsx`, `components/send/RecipientCard.tsx`, `components/send/EstimateCard.tsx`

**Interfaces:**
- Consumes: `useApi`, `useT`, `parseUsdInput`, `estimateQuote`, `formatMinor`, `formatRate`, `FIXTURE`, `maskAccount`, `initials`, `isApiError`, `errorText`, `browserStorage`, `SummaryRow`.
- Produces: `app/page.tsx` owns `step: 1 | 2`, `quote`, `recipient`, and `requestQuote(): Promise<boolean>`; Task 11 adds `<ReviewStep quote recipient onEdit onNewQuote quoting />`.

- [ ] **Step 1: Components**

`components/send/AmountField.tsx`:

```tsx
"use client";

import type { Ref } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange(value: string): void;
  onBlur(): void;
  errorText: string | null;
  inputRef: Ref<HTMLInputElement>;
};

export function AmountField({ value, onChange, onBlur, errorText, inputRef }: Props) {
  const { t } = useT();
  return (
    <div>
      <label htmlFor="amount" className="text-sm font-medium text-muted-foreground">
        {t("send.amountLabel")}
      </label>
      <div
        className={cn(
          "mt-2 flex items-center rounded-xl border bg-background px-4 focus-within:ring-2 focus-within:ring-ring",
          errorText && "border-destructive",
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
        <p id="amount-error" role="alert" className="mt-2 text-sm font-medium text-destructive">{errorText}</p>
      ) : (
        <p id="amount-help" className="mt-2 text-sm text-muted-foreground">{t("send.amountHelp")}</p>
      )}
    </div>
  );
}
```

`components/send/RecipientCard.tsx`:

```tsx
"use client";

import type { Recipient } from "@/lib/api/types";
import { initials, maskAccount } from "@/lib/format";
import { useT } from "@/lib/i18n/LanguageProvider";

export function RecipientCard({ recipient, failed }: { recipient: Recipient | null; failed: boolean }) {
  const { t } = useT();
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{t("send.recipientLabel")}</p>
      <div className="mt-2 flex items-center gap-4 rounded-xl border bg-background p-4">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary font-semibold text-brand">
          {recipient ? initials(recipient.name) : ""}
        </span>
        {recipient ? (
          <div className="min-w-0">
            <p className="font-semibold">{recipient.name}</p>
            <p className="text-sm text-muted-foreground">
              {recipient.bankLabel} · {maskAccount(recipient.accountDisplay)}
            </p>
          </div>
        ) : failed ? (
          <p className="text-sm text-destructive">{t("error.recipients")}</p>
        ) : (
          <div role="status" aria-label={t("common.loading")} className="h-10 w-48 animate-pulse rounded bg-muted" />
        )}
      </div>
    </div>
  );
}
```

`components/send/EstimateCard.tsx`:

```tsx
"use client";

import { SummaryRow } from "@/components/common/SummaryRow";
import { useT } from "@/lib/i18n/LanguageProvider";
import { FIXTURE, formatMinor, formatRate, type Estimate } from "@/lib/money";

export function EstimateCard({ estimate }: { estimate: Estimate | null }) {
  const { t, lang } = useT();
  return (
    <aside aria-labelledby="estimate-title" className="rounded-2xl border bg-card p-6 shadow-sm lg:sticky lg:top-8">
      <div className="flex items-center justify-between gap-3">
        <h2 id="estimate-title" className="text-sm font-medium text-muted-foreground">{t("send.theyReceive")}</h2>
        <span className="rounded-full border border-dashed px-2 py-0.5 text-xs font-medium text-muted-foreground">{t("send.estimate")}</span>
      </div>
      <p className="tabular mt-2 text-4xl font-semibold tracking-tight text-brand">
        {estimate ? formatMinor(estimate.destinationNetMinor, "THB", lang) : "—"}
      </p>
      <dl className="mt-6 space-y-3 text-sm">
        <SummaryRow label={t("send.fee")} value={estimate ? formatMinor(estimate.feeMinor, "USD", lang) : "—"} />
        <SummaryRow label={t("send.rate")} value={formatRate(FIXTURE.rateNumerator.toString(), FIXTURE.rateDenominator.toString(), lang)} />
        <SummaryRow label={t("send.arrival")} value={t("send.timing")} />
      </dl>
    </aside>
  );
}
```

- [ ] **Step 2: Page**

`app/page.tsx`:

```tsx
"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AmountField } from "@/components/send/AmountField";
import { EstimateCard } from "@/components/send/EstimateCard";
import { RecipientCard } from "@/components/send/RecipientCard";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api/ApiProvider";
import { isApiError } from "@/lib/api/errors";
import type { Quote, Recipient } from "@/lib/api/types";
import { errorText } from "@/lib/i18n/errorText";
import { useT } from "@/lib/i18n/LanguageProvider";
import { estimateQuote, parseUsdInput, type ParseError } from "@/lib/money";
import { browserStorage } from "@/lib/storage";

const AMOUNT_KEY = "centme:amount";

export default function SendPage() {
  const { api } = useApi();
  const { t } = useT();
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState("10.00");
  const [amountError, setAmountError] = useState<ParseError | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [recipientFailed, setRecipientFailed] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = browserStorage("session").getItem(AMOUNT_KEY);
    if (saved) setAmount(saved);
  }, []);

  useEffect(() => {
    api.getRecipients()
      .then((list) => setRecipient(list[0] ?? null))
      .catch(() => setRecipientFailed(true));
  }, [api]);

  const parsed = parseUsdInput(amount);
  const estimate = parsed.ok ? estimateQuote(parsed.minor) : null;
  const fieldError = amountError ? t(`send.error.${amountError}` as const) : serverError;

  function onAmountChange(value: string) {
    setAmount(value);
    setAmountError(null);
    setServerError(null);
    browserStorage("session").setItem(AMOUNT_KEY, value);
  }

  function onAmountBlur() {
    if (amount.trim() !== "" && !parsed.ok) setAmountError(parsed.error);
  }

  async function requestQuote(): Promise<boolean> {
    const p = parseUsdInput(amount);
    if (!p.ok) {
      setAmountError(p.error);
      inputRef.current?.focus();
      return false;
    }
    if (!recipient) return false;
    setQuoting(true);
    try {
      setQuote(await api.createQuote({ recipientId: recipient.id, sourceDebitMinor: p.minor }));
      return true;
    } catch (e) {
      if (isApiError(e, "INVALID_INPUT")) {
        setServerError(e.fieldErrors.sourceDebitMinor ?? e.message);
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
    if (await requestQuote()) setStep(2);
  }

  if (step === 2 && quote && recipient) {
    // Task 11 replaces this placeholder with <ReviewStep />.
    return <p>Review step</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
      <form onSubmit={onSubmit} aria-labelledby="send-title" className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8" noValidate>
        <h1 id="send-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("send.title")}</h1>
        <div className="mt-8 space-y-6">
          <AmountField value={amount} onChange={onAmountChange} onBlur={onAmountBlur} errorText={fieldError} inputRef={inputRef} />
          <RecipientCard recipient={recipient} failed={recipientFailed} />
        </div>
        <Button type="submit" className="mt-8 h-12 w-full text-base font-semibold" disabled={quoting || !recipient}>
          {quoting && <Loader2 className="animate-spin" aria-hidden />}
          {t("send.continue")}
        </Button>
      </form>
      <EstimateCard estimate={estimate} />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: succeeds.

Run: `npm run dev`, open `http://localhost:3000`.
Expected:
- $10.00 prefilled; estimate card shows ฿343.00, fee $0.20, "1 USD = 35 THB", "Demo timing only".
- Type `50` → estimate ฿1,715.00 instantly. Type `100.01`, tab away → "The maximum is $100.00 in test mode." under the field, red border.
- Recipient card: "DR · Demo Recipient · Demo Thai Bank · ••0001".
- Enter or **Continue** with $10 → placeholder "Review step".
- Toggle Thai: every string changes; nothing overflows at 375px width (DevTools device toolbar).

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx components/send
git commit -m "feat(web): send screen with live estimate"
```

---

### Task 11: Screen 2 — Review & pay with bank sheet

**Files:**
- Create: `lib/demoScenario.ts`, `components/review/ExpiryCountdown.tsx`, `components/review/BankSheet.tsx`, `components/review/ReviewStep.tsx`
- Modify: `app/page.tsx` (render `ReviewStep` in step 2)

**Interfaces:**
- Consumes: `getOrCreateKey`, `useApi`, `isApiError`, `errorText`, `formatMinor`, `formatRate`, `maskAccount`, `formatCountdown`, `EvidenceTag`, `SummaryRow`, shadcn `Dialog*`.
- Produces: `readScenario(store?): DemoScenario`, `writeScenario(s, store?)` (used by Task 13); navigation to `/transfers/<id>?fund=1` after transfer creation.

- [ ] **Step 1: Scenario storage**

`lib/demoScenario.ts`:

```ts
import { DEMO_SCENARIOS, type DemoScenario } from "./api/types";
import { browserStorage, type KeyValueStore } from "./storage";

const KEY = "centme:scenario";

export function readScenario(store: KeyValueStore = browserStorage("session")): DemoScenario {
  const v = store.getItem(KEY);
  return (DEMO_SCENARIOS as readonly string[]).includes(v ?? "") ? (v as DemoScenario) : "HAPPY_PATH";
}

export function writeScenario(scenario: DemoScenario, store: KeyValueStore = browserStorage("session")): void {
  store.setItem(KEY, scenario);
}
```

- [ ] **Step 2: Countdown and bank sheet**

`components/review/ExpiryCountdown.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { formatCountdown } from "@/lib/format";
import { useT } from "@/lib/i18n/LanguageProvider";

export function ExpiryCountdown({ expiresAt, expired, onExpire }: { expiresAt: string; expired: boolean; onExpire(): void }) {
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
      <span role="status" className="shrink-0 rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive">
        {t("review.expired")}
      </span>
    );
  }
  return (
    <span role="timer" className="tabular shrink-0 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-brand">
      {t("review.expiresIn", { time: formatCountdown(remaining) })}
    </span>
  );
}
```

`components/review/BankSheet.tsx` (if your generated `dialog.tsx` has no `showCloseButton` prop, delete that one prop):

```tsx
"use client";

import { Landmark, Loader2 } from "lucide-react";
import { EvidenceTag } from "@/components/common/EvidenceTag";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n/LanguageProvider";

type Props = {
  open: boolean;
  onOpenChange(open: boolean): void;
  amountText: string;
  paying: boolean;
  onConfirm(): void;
};

export function BankSheet({ open, onOpenChange, amountText, paying, onConfirm }: Props) {
  const { t } = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!paying}>
        <DialogHeader>
          <DialogTitle>{t("sheet.title")}</DialogTitle>
          <DialogDescription>{t("sheet.simNote")}</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border bg-background p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{t("sheet.from")}</span>
            <EvidenceTag tag="SIMULATED" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Landmark className="size-5 text-brand" aria-hidden />
            <span className="font-medium">{t("sheet.account")}</span>
          </div>
          <p className="tabular mt-4 text-3xl font-semibold">{amountText}</p>
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
```

- [ ] **Step 3: Review step**

`components/review/ReviewStep.tsx`:

```tsx
"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SummaryRow } from "@/components/common/SummaryRow";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api/ApiProvider";
import { isApiError } from "@/lib/api/errors";
import type { Quote, Recipient } from "@/lib/api/types";
import { readScenario } from "@/lib/demoScenario";
import { maskAccount } from "@/lib/format";
import { getOrCreateKey } from "@/lib/idempotency";
import { errorText } from "@/lib/i18n/errorText";
import { useT } from "@/lib/i18n/LanguageProvider";
import { formatMinor, formatRate } from "@/lib/money";
import { cn } from "@/lib/utils";
import { BankSheet } from "./BankSheet";
import { ExpiryCountdown } from "./ExpiryCountdown";

type Props = {
  quote: Quote;
  recipient: Recipient;
  onEdit(): void;
  onNewQuote(): Promise<boolean>;
  quoting: boolean;
};

export function ReviewStep({ quote, recipient, onEdit, onNewQuote, quoting }: Props) {
  const { api } = useApi();
  const { t, lang } = useT();
  const router = useRouter();
  const [expired, setExpired] = useState(() => Date.now() >= Date.parse(quote.expiresAt));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const payingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // A new quote remounts this component (key={quote.id} in app/page.tsx), so `expired` starts fresh.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  async function confirm() {
    if (payingRef.current) return;
    payingRef.current = true;
    setPaying(true);
    try {
      const key = getOrCreateKey(`transfer:${quote.id}`);
      const transfer = await api.createTransfer(
        { quoteId: quote.id, purpose: "PERSONAL_REMITTANCE", demoScenario: readScenario() },
        key,
      );
      router.replace(`/transfers/${encodeURIComponent(transfer.id)}?fund=1`);
    } catch (e) {
      payingRef.current = false;
      setPaying(false);
      if (isApiError(e, "QUOTE_EXPIRED")) {
        setSheetOpen(false);
        setExpired(true);
      } else if (isApiError(e, "QUOTE_ALREADY_ACCEPTED")) {
        setSheetOpen(false);
        toast.error(t("review.alreadyUsed"));
        onEdit();
      } else {
        toast.error(errorText(e, t));
      }
    }
  }

  const amountText = formatMinor(quote.sourceDebitMinor, "USD", lang);

  return (
    <section aria-labelledby="review-title" className="mx-auto max-w-xl rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <h1 id="review-title" ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
          {t("review.title")}
        </h1>
        <ExpiryCountdown expiresAt={quote.expiresAt} expired={expired} onExpire={() => setExpired(true)} />
      </div>

      <div className={cn("mt-6 transition-opacity", expired && "opacity-50")}>
        <p className="text-sm text-muted-foreground">{t("send.theyReceive")}</p>
        <p className="tabular mt-1 text-4xl font-semibold tracking-tight text-brand">
          {formatMinor(quote.destinationNetMinor, "THB", lang)}
        </p>
        <dl className="mt-6 space-y-3 border-t pt-6 text-sm">
          <SummaryRow label={t("review.youSend")} value={amountText} strong />
          <SummaryRow label={t("send.fee")} value={formatMinor(quote.feeMinor, "USD", lang)} />
          <SummaryRow label={t("send.rate")} value={formatRate(quote.fxRateNumerator, quote.fxRateDenominator, lang)} />
          <SummaryRow
            label={t("send.recipientLabel")}
            value={`${recipient.name} · ${recipient.bankLabel} ${maskAccount(recipient.accountDisplay)}`}
          />
          <SummaryRow label={t("send.arrival")} value={t("send.timing")} />
        </dl>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {expired ? (
          <Button className="h-12 text-base font-semibold" onClick={() => void onNewQuote()} disabled={quoting}>
            {quoting && <Loader2 className="animate-spin" aria-hidden />}
            {t("review.newQuote")}
          </Button>
        ) : (
          <Button className="h-12 text-base font-semibold" onClick={() => setSheetOpen(true)}>
            {t("review.pay", { amount: amountText })}
          </Button>
        )}
        <Button variant="ghost" onClick={onEdit} disabled={paying}>
          {t("review.edit")}
        </Button>
      </div>

      <BankSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!payingRef.current) setSheetOpen(open);
        }}
        amountText={amountText}
        paying={paying}
        onConfirm={() => void confirm()}
      />
    </section>
  );
}
```

- [ ] **Step 4: Wire into the page**

In `app/page.tsx`, add the import:

```tsx
import { ReviewStep } from "@/components/review/ReviewStep";
```

and replace the placeholder block

```tsx
  if (step === 2 && quote && recipient) {
    // Task 11 replaces this placeholder with <ReviewStep />.
    return <p>Review step</p>;
  }
```

with

```tsx
  if (step === 2 && quote && recipient) {
    return (
      <ReviewStep
        key={quote.id}
        quote={quote}
        recipient={recipient}
        onEdit={() => setStep(1)}
        onNewQuote={requestQuote}
        quoting={quoting}
      />
    );
  }
```

Note: `key={quote.id}` remounts the step for a fresh quote, so focus, countdown and the pay lock reset cleanly.

- [ ] **Step 5: Verify**

Run: `npm run build`
Expected: succeeds (the `/transfers/[id]` route does not exist yet; navigation 404s until Task 12).

Run: `npm run dev` and walk through:
- Continue → "Check before you send", countdown "Expires in 5:00" ticking, ฿343.00, rows, **Pay $10.00**, Edit.
- Pay → sheet "Demo Checking ••4821", SIMULATED tag, $10.00, Confirm focused. Esc closes it.
- Confirm → URL becomes `/transfers/mock_transfer_N?fund=1` (404 page for now). Browser Back does not return to the sheet.
- DevTools console: `sessionStorage` has `centme:key:transfer:mock_quote_N`.
- Expiry: in DevTools console run `localStorage.clear(); sessionStorage.clear()`, reload, Continue, wait 5 minutes (or temporarily set `QUOTE_TTL_MS` to 10_000 in `lib/api/mock.ts` and revert after) → "Quote expired", card dims, **Get new quote** returns a fresh 5:00.

- [ ] **Step 6: Commit**

```bash
git add lib/demoScenario.ts components/review app/page.tsx
git commit -m "feat(web): review and simulated bank payment step"
```

---

### Task 12: Screen 3 — Track → Receipt

**Files:**
- Create: `app/transfers/[id]/page.tsx`, `components/track/TrackView.tsx`, `components/track/Timeline.tsx`, `components/track/NotifiedChip.tsx`, `components/track/Details.tsx`, `components/track/Receipt.tsx`

**Interfaces:**
- Consumes: `useTransfer`, `toView`, `stepTime`, `TransferView`, `StepState`, `getOrCreateKey`, `isApiError`, `NetworkError`, `errorText`, `formatMinor`, `formatRate`, `formatTokenUnits`, `formatDateTime`, `shortHash`, `maskAccount`, `EvidenceTag`, `SummaryRow`.
- Produces: `<Timeline view snapshot />` with connector spans that Task 14 animates; `<Receipt snapshot onSendAnother />`.

- [ ] **Step 1: Route**

`app/transfers/[id]/page.tsx`:

```tsx
import { TrackView } from "@/components/track/TrackView";

export default async function TransferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TrackView id={id} />;
}
```

- [ ] **Step 2: Timeline**

`components/track/Timeline.tsx`:

```tsx
"use client";

import { Check, ExternalLink, Loader2, Pause, X } from "lucide-react";
import { EvidenceTag } from "@/components/common/EvidenceTag";
import type { TransferSnapshot } from "@/lib/api/types";
import { formatDateTime, shortHash } from "@/lib/format";
import { useT } from "@/lib/i18n/LanguageProvider";
import { stepTime, type StepState, type TransferView } from "@/lib/status";
import { cn } from "@/lib/utils";

function StepIcon({ state }: { state: StepState }) {
  const base = "relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2";
  switch (state) {
    case "done":
      return <span className={cn(base, "border-brand bg-brand text-white")}><Check className="draw-check size-5" aria-hidden /></span>;
    case "active":
      return <span className={cn(base, "border-brand bg-card text-brand")}><Loader2 className="size-5 animate-spin" aria-hidden /></span>;
    case "failed":
      return <span className={cn(base, "border-destructive bg-destructive text-white")}><X className="size-5" aria-hidden /></span>;
    case "hold":
      return <span className={cn(base, "border-pending bg-card text-pending")}><Pause className="size-5" aria-hidden /></span>;
    default:
      return <span className={cn(base, "border-border bg-card")} aria-hidden />;
  }
}

function SettlementEvidence({ snapshot }: { snapshot: TransferSnapshot }) {
  const { t } = useT();
  const { txHash, explorerUrl, mode } = snapshot.settlement;
  if (!txHash) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm animate-in fade-in duration-300">
      <code className="font-mono text-muted-foreground">{shortHash(txHash)}</code>
      {mode === "TESTNET" && explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-brand underline-offset-4 hover:underline"
        >
          {t("track.viewExplorer")}
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
    </div>
  );
}

export function Timeline({ view, snapshot, className }: { view: TransferView; snapshot: TransferSnapshot; className?: string }) {
  const { t, lang } = useT();
  return (
    <ol className={cn("relative", className)}>
      {view.steps.map((step, i) => {
        const last = i === view.steps.length - 1;
        const time = step.state === "done" ? stepTime(snapshot, step.id) : null;
        return (
          <li key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
            {!last && (
              <span aria-hidden className="connector absolute bottom-1 left-5 top-11 w-0.5 -translate-x-1/2 bg-border">
                <span
                  className={cn(
                    "block h-full w-full origin-top bg-brand transition-transform duration-300 ease-out",
                    step.state === "done" ? "scale-y-100" : "scale-y-0",
                  )}
                />
              </span>
            )}
            <StepIcon state={step.state} />
            <div className="min-w-0 flex-1 pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("font-semibold", step.state === "todo" && "text-muted-foreground")}>{t(step.labelKey)}</span>
                <EvidenceTag tag={step.tag} />
                <span className="sr-only">{t(`state.${step.state}` as const)}</span>
              </div>
              {time && <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(time, lang)}</p>}
              {step.id === "settlement" && <SettlementEvidence snapshot={snapshot} />}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 3: Chip, details, receipt**

`components/track/NotifiedChip.tsx`:

```tsx
"use client";

import { Smartphone } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";

export function NotifiedChip() {
  const { t } = useT();
  return (
    <span role="status" className="inline-flex items-center gap-2 rounded-full bg-primary/40 px-3 py-1.5 text-sm font-medium text-foreground animate-in fade-in zoom-in-95 duration-200">
      <Smartphone className="size-4" aria-hidden />
      {t("track.notified")}
    </span>
  );
}
```

`components/track/Details.tsx`:

```tsx
"use client";

import { ChevronDown } from "lucide-react";
import { SummaryRow } from "@/components/common/SummaryRow";
import type { TransferSnapshot } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

export function Details({ snapshot: s, className }: { snapshot: TransferSnapshot; className?: string }) {
  const { t, lang } = useT();
  const mock = s.settlement.mode === "MOCK";
  return (
    <details className={cn("group rounded-xl border bg-background", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        {t("track.details")}
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <dl className="space-y-3 border-t px-4 py-4 text-sm">
        <SummaryRow label={t("detail.transferId")} value={<code className="font-mono break-all">{s.id}</code>} />
        <SummaryRow label={t("receipt.fundingRef")} value={s.funding.reference ?? "—"} />
        <SummaryRow label={t("receipt.payoutRef")} value={s.payout.reference ?? "—"} />
        <SummaryRow
          label={t("receipt.txHash")}
          value={s.settlement.txHash ? <code className="font-mono break-all">{s.settlement.txHash}</code> : "—"}
        />
        <SummaryRow label={t("detail.network")} value={mock ? t("detail.networkMock") : `Avalanche Fuji (${s.settlement.chainId})`} />
        <SummaryRow label={t("detail.token")} value={<code className="font-mono break-all">{s.settlement.tokenAddress}</code>} />
        <SummaryRow label={t("receipt.verifiedAt")} value={s.settlement.verifiedAt ? formatDateTime(s.settlement.verifiedAt, lang) : "—"} />
      </dl>
    </details>
  );
}
```

`components/track/Receipt.tsx`:

```tsx
"use client";

import { Check, ExternalLink, Link2 } from "lucide-react";
import { toast } from "sonner";
import { SummaryRow } from "@/components/common/SummaryRow";
import { Button } from "@/components/ui/button";
import type { TransferSnapshot } from "@/lib/api/types";
import { formatDateTime, maskAccount, shortHash } from "@/lib/format";
import { useT } from "@/lib/i18n/LanguageProvider";
import { formatMinor, formatRate, formatTokenUnits } from "@/lib/money";

export function Receipt({ snapshot: s, onSendAnother }: { snapshot: TransferSnapshot; onSendAnother(): void }) {
  const { t, lang } = useT();
  if (!s.receipt) return null;
  const a = s.amounts;
  const received = a.destinationNetMinor;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("action.copied"));
    } catch {
      toast(window.location.href);
    }
  }

  return (
    <section
      aria-labelledby="receipt-title"
      className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-primary">
          <Check className="size-5 text-foreground" aria-hidden />
        </span>
        <h2 id="receipt-title" className="text-lg font-semibold">{t("receipt.title")}</h2>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">{t("receipt.theyReceived")}</p>
      <p className="tabular text-4xl font-semibold tracking-tight text-brand">{formatMinor(received, "THB", lang)}</p>
      <p className="mt-2 text-sm font-medium">{t("receipt.summary")}</p>

      <dl className="mt-6 space-y-3 border-t pt-6 text-sm">
        <SummaryRow label={t("receipt.youSent")} value={formatMinor(a.sourceDebitMinor, "USD", lang)} strong />
        <SummaryRow label={t("send.fee")} value={formatMinor(a.feeMinor, "USD", lang)} />
        <SummaryRow label={t("send.rate")} value={formatRate(s.fx.rateNumerator, s.fx.rateDenominator, lang)} />
        <SummaryRow label={t("receipt.usdc")} value={formatTokenUnits(a.settlementTokenUnits, s.settlement.tokenDecimals)} />
        <SummaryRow
          label={t("receipt.recipient")}
          value={`${s.recipient.name} · ${s.recipient.bankLabel} ${maskAccount(s.recipient.accountDisplay)}`}
        />
        <SummaryRow label={t("receipt.fundingRef")} value={s.funding.reference ?? "—"} />
        <SummaryRow label={t("receipt.payoutRef")} value={s.payout.reference ?? "—"} />
        <SummaryRow
          label={t("receipt.txHash")}
          value={
            s.settlement.txHash ? (
              <span className="inline-flex flex-wrap items-center justify-end gap-2">
                <code className="font-mono">{shortHash(s.settlement.txHash)}</code>
                {s.settlement.mode === "TESTNET" && s.settlement.explorerUrl && (
                  <a href={s.settlement.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand underline-offset-4 hover:underline">
                    {t("track.viewExplorer")}
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                )}
              </span>
            ) : "—"
          }
        />
        <SummaryRow label={t("receipt.verifiedAt")} value={s.settlement.verifiedAt ? formatDateTime(s.settlement.verifiedAt, lang) : "—"} />
        <SummaryRow label={t("receipt.id")} value={<code className="font-mono">{s.receipt.id}</code>} />
        <SummaryRow label={t("receipt.issued")} value={formatDateTime(s.receipt.issuedAt, lang)} />
      </dl>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button className="h-12 flex-1 text-base font-semibold" onClick={onSendAnother}>{t("action.SEND_ANOTHER")}</Button>
        <Button variant="outline" className="h-12 flex-1 text-base" onClick={() => void copyLink()}>
          <Link2 aria-hidden />
          {t("action.COPY_LINK")}
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Track view**

`components/track/TrackView.tsx`:

```tsx
"use client";

import { AlertTriangle, Loader2, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api/ApiProvider";
import { isApiError, NetworkError } from "@/lib/api/errors";
import { getOrCreateKey } from "@/lib/idempotency";
import { errorText } from "@/lib/i18n/errorText";
import { useT } from "@/lib/i18n/LanguageProvider";
import { formatMinor } from "@/lib/money";
import { toView, type PrimaryAction } from "@/lib/status";
import { useTransfer } from "@/lib/useTransfer";
import { Details } from "./Details";
import { NotifiedChip } from "./NotifiedChip";
import { Receipt } from "./Receipt";
import { Timeline } from "./Timeline";

export function TrackView({ id }: { id: string }) {
  const { api } = useApi();
  const { t, lang } = useT();
  const router = useRouter();
  const { snapshot, error, accept, kick } = useTransfer(id);
  const [busy, setBusy] = useState(false);
  const autoFundRef = useRef(false);

  const runFunding = useCallback(async () => {
    setBusy(true);
    try {
      accept(await api.simulateFunding(id, getOrCreateKey(`funding:${id}`)));
      kick();
    } catch (e) {
      if (isApiError(e, "INVALID_STATE")) kick();
      else toast.error(errorText(e, t));
    } finally {
      setBusy(false);
    }
  }, [api, id, accept, kick, t]);

  // Arriving from the bank sheet: fund once. Refresh replays the same key, so no double funding.
  useEffect(() => {
    if (autoFundRef.current || !snapshot) return;
    if (new URLSearchParams(window.location.search).get("fund") !== "1") return;
    autoFundRef.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    if (snapshot.status === "FUNDING_PENDING") void runFunding();
  }, [snapshot, runFunding]);

  async function retryPayout() {
    if (!snapshot) return;
    setBusy(true);
    try {
      accept(await api.retryPayout(id, getOrCreateKey(`payout:${id}:${snapshot.version}`)));
      kick();
    } catch (e) {
      if (isApiError(e, "INVALID_STATE")) kick();
      else toast.error(errorText(e, t));
    } finally {
      setBusy(false);
    }
  }

  function onAction(action: NonNullable<PrimaryAction>) {
    if (action === "FINISH_PAYMENT") void runFunding();
    else if (action === "RETRY_PAYOUT") void retryPayout();
    else router.push("/");
  }

  if (!snapshot) {
    if (isApiError(error, "NOT_FOUND")) {
      return (
        <section className="mx-auto max-w-xl rounded-2xl border bg-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">{t("track.notFound")}</h1>
          <Button asChild className="mt-6 h-12 text-base font-semibold">
            <Link href="/">{t("action.START_OVER")}</Link>
          </Button>
        </section>
      );
    }
    return (
      <section role="status" aria-label={t("common.loading")} className="mx-auto max-w-3xl rounded-2xl border bg-card p-8 shadow-sm">
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-8 w-72 animate-pulse rounded bg-muted" />
        <div className="mt-8 space-y-6">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}
        </div>
      </section>
    );
  }

  const view = toView(snapshot);
  const a = snapshot.amounts;

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <section aria-labelledby="track-title" className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <p className="tabular text-sm text-muted-foreground">
          {t("track.summary", {
            send: formatMinor(a.sourceDebitMinor, "USD", lang),
            receive: formatMinor(a.destinationNetMinor, "THB", lang),
            name: snapshot.recipient.name,
          })}
        </p>
        <h1 id="track-title" aria-live="polite" className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {t(view.headlineKey)}
        </h1>

        {error instanceof NetworkError && (
          <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
            <WifiOff className="size-4 shrink-0" aria-hidden />
            {t("track.offline")}
          </p>
        )}
        {view.issueMessage && (
          <p role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-pending/10 p-3 text-sm text-pending">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {view.issueMessage}
          </p>
        )}

        <Timeline className="mt-8" view={view} snapshot={snapshot} />

        {view.notified && <div className="mt-6"><NotifiedChip /></div>}

        {view.action && !view.showReceipt && (
          <Button className="mt-6 h-12 w-full text-base font-semibold sm:w-auto" onClick={() => onAction(view.action!)} disabled={busy}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {t(`action.${view.action}` as const)}
          </Button>
        )}

        <Details snapshot={snapshot} className="mt-6" />
      </section>

      {view.showReceipt && <Receipt snapshot={snapshot} onSendAnother={() => router.push("/")} />}
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npm test && npm run build`
Expected: PASS; build succeeds.

Run: `npm run dev`, do a full $10 happy path in mock mode.
Expected:
- After Confirm: lands on the track page, the `?fund=1` disappears from the URL, the timeline walks steps 1→4 about one step per 2–3s, the settlement step shows `mock-0x…` with **no** Snowtrace link and a `MOCK` tag, label "Settlement (mock, no blockchain)".
- Completion: headline "Transfer complete", receipt card with all rows, "Demo completed — THB payout simulated.", and "Recipient notified" chip once `.env.local` has a topic and the ntfy app on the iPhone is subscribed to it (phone shows "[MOCK] Demo Recipient received ฿343.00 · THB payout simulated.").
- Refresh mid-transfer: resumes at the same step, no second funding (Details → funding reference unchanged).
- Visit `/transfers/nope` → "We couldn't find this transfer." with Start over.

- [ ] **Step 6: Commit**

```bash
git add app/transfers components/track
git commit -m "feat(web): live tracking timeline and receipt"
```

---

### Task 13: Hidden presenter panel

**Files:**
- Create: `components/demo/PresenterPanel.tsx`
- Modify: `app/layout.tsx` (render the panel inside `<Providers>`)

**Interfaces:**
- Consumes: `useApi().modes`, `useApi().resetMock`, `readScenario`, `writeScenario`, `DEMO_SCENARIOS`, `ENDPOINT_GROUPS`.

- [ ] **Step 1: Panel**

`components/demo/PresenterPanel.tsx`:

```tsx
"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api/ApiProvider";
import { ENDPOINT_GROUPS } from "@/lib/api/index";
import { DEMO_SCENARIOS, type DemoScenario } from "@/lib/api/types";
import { readScenario, writeScenario } from "@/lib/demoScenario";
import { useT } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

export function PresenterPanel() {
  const { modes, resetMock } = useApi();
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scenario, setScenario] = useState<DemoScenario>("HAPPY_PATH");

  useEffect(() => {
    setScenario(readScenario());
    if (new URLSearchParams(window.location.search).get("demo") === "1") setOpen(true);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "d" || e.key === "D") setOpen((o) => !o);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <aside aria-label={t("demo.title")} className="fixed bottom-4 right-4 z-50 w-72 rounded-2xl border bg-card p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("demo.title")}</h2>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label={t("demo.close")}>
          <X aria-hidden />
        </Button>
      </div>

      <fieldset className="mt-3">
        <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("demo.scenario")}</legend>
        <div className="mt-2 space-y-1">
          {DEMO_SCENARIOS.map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              <input
                type="radio"
                name="scenario"
                value={s}
                checked={scenario === s}
                onChange={() => {
                  setScenario(s);
                  writeScenario(s);
                }}
                className="accent-[var(--brand)]"
              />
              {t(`demo.${s}` as const)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("demo.endpoints")}</p>
        <ul className="mt-2 space-y-1 text-sm">
          {ENDPOINT_GROUPS.map((g) => (
            <li key={g} className="flex items-center justify-between">
              <span>{g}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold uppercase",
                  modes[g] === "real" ? "bg-primary/40 text-foreground" : "border border-dashed border-pending text-pending",
                )}
              >
                {modes[g]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-4 w-full"
        onClick={() => {
          resetMock();
          router.push("/");
        }}
      >
        {t("demo.reset")}
      </Button>
    </aside>
  );
}
```

- [ ] **Step 2: Mount in layout**

In `app/layout.tsx` add the import:

```tsx
import { PresenterPanel } from "@/components/demo/PresenterPanel";
```

and change

```tsx
          <main id="main" className="mx-auto w-full max-w-[1040px] px-4 py-8 sm:px-6 lg:py-12">
            {children}
          </main>
        </Providers>
```

to

```tsx
          <main id="main" className="mx-auto w-full max-w-[1040px] px-4 py-8 sm:px-6 lg:py-12">
            {children}
          </main>
          <PresenterPanel />
        </Providers>
```

- [ ] **Step 3: Verify**

Run: `npm run build`, then `npm run dev`.
Expected:
- Press `D` (focus not in the amount field) → panel bottom-right; `D` again hides it. `?demo=1` opens it on load.
- Choose **Funding declined**, run a transfer → step 1 turns red, "Payment declined. No money moved.", **Start over**; no hash anywhere.
- Choose **Payout failed** → step 4 red, "Bank payout failed. Your USDC transfer is safe.", **Retry payout** → completes; Details shows the same tx hash as before the retry and a new payout reference.
- All four endpoint badges read MOCK. **Reset mock data** returns to `/` and old transfer URLs show "not found".

- [ ] **Step 4: Commit**

```bash
git add components/demo app/layout.tsx
git commit -m "feat(web): hidden presenter panel for demo scenarios"
```

---

### Task 14: Motion — the wow sequence

**Files:**
- Modify: `app/globals.css` (append keyframes), `lib/money.ts` (add `interpolateMinor`), `lib/money.test.ts`, `components/track/Timeline.tsx` (token dot), `components/track/Receipt.tsx` (count-up)
- Create: `lib/useCountUp.ts`

**Interfaces:**
- Produces: `interpolateMinor(target: string, progress: number): string`, `useCountUp(target: string, durationMs?: number): string`.

- [ ] **Step 1: Write the failing test**

Append to `lib/money.test.ts` (and add `interpolateMinor` to its import list from `./money`):

```ts
describe("interpolateMinor", () => {
  it("interpolates integer minor units and clamps progress", () => {
    expect(interpolateMinor("34300", 0)).toBe("0");
    expect(interpolateMinor("34300", 0.5)).toBe("17150");
    expect(interpolateMinor("34300", 1)).toBe("34300");
    expect(interpolateMinor("34300", 1.7)).toBe("34300");
    expect(interpolateMinor("34300", -1)).toBe("0");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/money.test.ts`
Expected: FAIL, `interpolateMinor` is not exported.

- [ ] **Step 3: Implement**

Append to `lib/money.ts`:

```ts
/** Animation helper: integer-only value at a progress in [0, 1]. */
export function interpolateMinor(target: string, progress: number): string {
  const p = Math.min(1, Math.max(0, progress));
  return ((BigInt(target) * BigInt(Math.round(p * 1000))) / 1000n).toString();
}
```

`lib/useCountUp.ts`:

```ts
"use client";

import { useEffect, useState } from "react";
import { interpolateMinor } from "./money";

export function useCountUp(target: string, durationMs = 700): string {
  const [value, setValue] = useState("0");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      setValue(interpolateMinor(target, 1 - (1 - p) ** 3)); // ease-out cubic
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}
```

Append to `app/globals.css`:

```css
@keyframes centme-draw {
  to {
    stroke-dashoffset: 0;
  }
}
.draw-check path,
.draw-check polyline {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  animation: centme-draw 300ms ease-out forwards;
}

@keyframes centme-travel {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}
.token-travel {
  animation: centme-travel 1.2s ease-in-out infinite;
}
```

In `components/track/Timeline.tsx`, inside the connector `<span aria-hidden className="connector …">`, after the fill `<span … />`, add the travelling token shown while settlement is in progress:

```tsx
                {step.id === "settlement" && step.state === "active" && (
                  <span className="absolute -inset-x-2 inset-y-0 overflow-hidden">
                    <span className="token-travel absolute inset-x-0 top-0 h-full">
                      <span className="absolute bottom-0 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-primary ring-2 ring-brand" />
                    </span>
                  </span>
                )}
```

In `components/track/Receipt.tsx`, add `import { useCountUp } from "@/lib/useCountUp";` and replace

```tsx
  if (!s.receipt) return null;
  const a = s.amounts;
  const received = a.destinationNetMinor;
```

with

```tsx
  const a = s.amounts;
  const received = useCountUp(a.destinationNetMinor);
  if (!s.receipt) return null;
```

(The hook must run before the early return.)

- [ ] **Step 4: Verify**

Run: `npm test && npm run build`
Expected: PASS; build succeeds.

Run: `npm run dev`, full happy path:
- Each completed step's check draws in; the green line grows down to the next step.
- While settlement is in progress a lime dot travels down the line toward "Delivered to Thai bank".
- On completion the receipt slides up and "They received" counts from ฿0.00 to ฿343.00 (whole satang only), the chip pops, the phone buzzes.
- DevTools → Rendering → "Emulate prefers-reduced-motion: reduce": everything appears instantly, the amount shows ฿343.00 at once.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css lib/money.ts lib/money.test.ts lib/useCountUp.ts components/track
git commit -m "feat(web): timeline motion, token travel and receipt count-up"
```

---

### Task 15: Walkthrough checklist, real-endpoint switch-over and design polish

**Files:**
- Create: `../docs/walkthrough.md` (repo `docs/`, not the app)

- [ ] **Step 1: Write the walkthrough**

`docs/walkthrough.md` (repo root):

```markdown
# CentMe browser walkthrough

Run each row in mock mode first, then with `NEXT_PUBLIC_REAL_ENDPOINTS=all`. Mark pass/fail and note the tx hash for real runs.

| # | Check | Expected | Mock | Real |
|---|---|---|---|---|
| 1 | Happy path $10 | Review shows ฿343.00 / fee $0.20; receipt amounts match review; completion copy "Demo completed — THB payout simulated." | | |
| 2 | Funding declined (panel) | Step 1 red, no tx hash, Start over | | |
| 3 | Payout failed → Retry payout | Completes; tx hash identical before and after retry; new payout reference | | |
| 4 | Refresh mid-transfer | Resumes on same step; funding reference unchanged | | |
| 5 | Double-click Confirm payment | One transfer only (Details → one transfer ID; real: one DB row) | | |
| 6 | Quote expiry on review | "Quote expired", card dims, Get new quote gives a fresh 5:00 | | |
| 7 | Invalid amounts: 0.50, 100.01, 1e2, -5, 10.505 | Inline message under field, Continue blocked | | |
| 8 | TH toggle on every screen | No English left except product/tech names; no overflow at 375px | | |
| 9 | Keyboard only | Tab order logical; Enter submits; Esc closes sheet; focus visible everywhere | | |
| 10 | Reduced motion | No animation; values appear immediately | | |
| 11 | Incognito: open another session's receipt URL | "We couldn't find this transfer." (real mode) | n/a | |
| 12 | iPhone ntfy push on completion | Banner within a few seconds; text honest about simulation | | |
| 13 | Real settlement evidence | TESTNET tag, Snowtrace link opens the real tx, verified time shown | n/a | |
```

- [ ] **Step 2: Run the walkthrough in mock mode**

Run: `npm run dev` and execute rows 1–10 and 12. Record results in the table. Fix any failure in the owning task's files and re-run `npm test`.

- [ ] **Step 3: Switch endpoint groups as backend owners land them**

When person 2's session, recipients and quotes routes are merged:

```bash
# .env.local
NEXT_PUBLIC_REAL_ENDPOINTS=session,recipients,quotes
```

Restart `npm run dev`, run rows 1, 6, 7. Watch for red "contract mismatch" toasts; report the named field to the endpoint owner rather than changing the frontend schema.

When person 3's transfer routes are merged (person 4's settlement fills `settlement.*` through `advance`):

```bash
NEXT_PUBLIC_REAL_ENDPOINTS=all
```

Run every row including 11 and 13. Confirm the Snowtrace link opens the actual transaction. If `notification` is absent from the real snapshot, the chip stays hidden; ask person 3 for the field and server-side ntfy push (spec section 6).

Set the same variable in Vercel project settings for the deployed demo.

- [ ] **Step 4: Design QA**

Invoke the `impeccable` skill with `audit` on the three screens (send, review + sheet, track + receipt), fix CRITICAL/HIGH findings, then run `impeccable` `polish`. Re-run `npm test && npm run build` after changes.

- [ ] **Step 5: Backup recording**

Record one verified real run (screen + phone) and save the tx hash and receipt screenshot with the presenter, labelled as a recording.

- [ ] **Step 6: Commit**

```bash
cd /d/U-Hackathon
git add docs/walkthrough.md
git commit -m "docs: CentMe browser walkthrough checklist and results"
```
