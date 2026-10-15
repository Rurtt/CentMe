# CentMe frontend design

Date: 2026-10-16, Asia/Bangkok. Owner: person 1 (frontend). Status: approved; no frontend code exists yet.

**Revised 2026-10-16 after backend v1** (person 3, `4rtem1sss/U-hackathon_backend`, branch `part3/backend-core`): frontend now lives inside the backend repo (section 7), notification shape follows the backend (section 6), real-endpoint switch order fixed (section 5), receipt shows the server summary (section 2). Visual design unchanged.

Scope: send, quote, tracking, receipt and browser walkthrough for the USD-to-THB demo. Backend contract: [API contract](../../api-contract.md). Demo scope: [current scope](2026-10-15-p2p-sandbox-scope-and-next-steps.md). This spec does not change backend ownership.

| Person | Owns |
|---|---|
| 1 | Frontend: send, quote, tracking, receipt, browser walkthrough (this spec) |
| 2 | Sessions, recipients, quote API, money calculations and expiry tests |
| 3 | Database/schema, transfer states, idempotency, funding/payout simulation; integration lead |
| 4 | Fuji module, persisted signing, receipt verification, recovery tests; worker if adopted |

## 1. Goals and constraints

- Product name: **CentMe**. Logo pending; placeholder wordmark until supplied.
- Easiest possible sender flow that still feels like a real bank: one deliberate review-and-confirm moment before money moves.
- Laptop-first (projector demo). Must still work at 375px width for the phone/receipt view.
- English default, TH/EN toggle in the header.
- Honest evidence labels on every leg: `SIMULATED` for USD funding, conversion and THB payout; `TESTNET · Fuji` for settlement. Completion copy: "Demo completed — THB payout simulated."
- Time budget: about 12 hours. Polish focuses on the three screens; no dark mode, no extra pages.
- Backend is being built in parallel. Frontend must work before any endpoint exists and switch to real endpoints one at a time.
- Wow moment: the tracking timeline fills in, a real Snowtrace link appears, then the presenter's iPhone receives a push notification.

## 2. Screens and flow

Two routes, three screens.

### Header (all screens)

CentMe logo (`components/brand/Logo.tsx`), `TEST MODE` pill, TH/EN toggle. In mock mode, a `MOCK DATA` banner sits under the header.

### Screen 1: Send (`/`, step 1)

- Left: "You send" USD input, prefilled `10.00`. Validation on blur and on Continue: USD 1.00–100.00, at most two decimals; friendly inline message below the field.
- Left: recipient card, preselected (only one synthetic recipient): "Demo Recipient · Demo Thai Bank · TEST ACCOUNT 0001".
- Right: live summary card labelled **Estimate**: "They receive ฿343.00", fee, rate "1 USD = 35 THB", "Demo timing only". Computed in the browser using the contract's fixture formula (section 5), so typing never hits the server.
- One primary button: **Continue**. It creates the real quote (`POST /api/quotes`) and moves to step 2.

### Screen 2: Review & pay (`/`, step 2)

- "Check before you send" card: you send, fee, rate, they receive, recipient (masked account), quote expiry countdown chip (5:00, mirrors server `expiresAt`), `Edit` link back to step 1.
- Primary button: **Pay $10.00**. Opens the bank sheet.
- Bank sheet (modal): "Pay from Demo Checking ••4821 · USD 10.00", `SIMULATED` pill, **Confirm payment** and Cancel. Confirm locks after one click and shows a spinner.
- Expired quote: card greys out, countdown reads "Expired", primary button becomes **Get new quote**. Never silently re-prices.
- Refresh on this step returns to step 1 with the amount kept (no GET-quote route exists; quote would expire anyway).

### Screen 3: Track → Receipt (`/transfers/[id]`)

Vertical timeline, four steps, each with icon, plain-language label, timestamp and evidence tag:

| Step | Label | Tag | Driven by |
|---|---|---|---|
| 1 | Payment received | SIMULATED | `funding.status` |
| 2 | Converted to USDC | SIMULATED | `fx` + funding accepted |
| 3 | Sent on Avalanche Fuji | TESTNET · Fuji | `settlement.status`, `txHash`, `explorerUrl` |
| 4 | Delivered to Thai bank | SIMULATED | `payout.status` |

- A "Recipient notified" chip (Lucide `smartphone`) appears when `notification.status === "SENT"` (see section 6).
- Technical details (tx hash, references, chain ID, token address) sit behind a "Details" disclosure.
- On `COMPLETED_SIMULATED`: success state, "They received ฿343.00" counts up, receipt card slides in with amounts, fee, rate, funding/payout references, tx hash + Snowtrace link, `verifiedAt`, receipt ID, issued time and the honest summary line. Actions: **Send another**, **Copy link**.
- Completion headline comes from i18n ("Demo completed — THB payout simulated."). The receipt card also shows the server's `receipt.summary` verbatim in small text (English only; it is evidence, not UI copy).
- Back button after paying lands on tracking, never on a payable form (`router.replace`).

### Status to UI mapping

| Status | Timeline | Primary action |
|---|---|---|
| `FUNDING_PENDING` | step 1 active | if funding call was lost: **Finish payment** (reuses saved key) |
| `FUNDED_SIMULATED` | 1–2 done, 3 active | none, auto-progress |
| `FUNDING_FAILED` | step 1 red: "Payment declined. No money moved." | **Start over** |
| `SETTLEMENT_PENDING` | 3 active; hash shown once present | none; if `lastIssue` show amber "Still confirming on Fuji…" |
| `SETTLED` | 1–3 done, 4 active | none |
| `SETTLEMENT_FAILED` | step 3 red, hash kept | **Start over** |
| `PAYOUT_PENDING` | 4 active | none |
| `PAYOUT_FAILED` | step 4 red: "Bank payout failed. Your USDC transfer is safe." | **Retry payout** |
| `REVIEW_REQUIRED` | amber hold on the affected step | none; show `lastIssue.message` |
| `COMPLETED_SIMULATED` | all green, receipt | **Send another**, **Copy link** |

Unknown status from the server renders the amber hold state rather than crashing.

### Presenter panel (hidden)

Opened with `D` key or `?demo=1`. Contains: scenario picker (`HAPPY_PATH`, `FUNDING_DECLINED`, `PAYOUT_FAILED`, stored in `sessionStorage`, sent as `demoScenario` on transfer creation), per-endpoint mock/real badges, reset mock data. Judges never see it unless opened.

## 3. Ease-of-use rules

- One primary action per screen (lime button). Everything else visually quieter.
- Smart defaults: amount prefilled, recipient preselected. Happy path is Continue → Pay → Confirm.
- Money in human words first ("They receive ฿343.00"); fee and rate in one calm line.
- Plain-language status, never raw enums. Tech details behind "Details".
- Every error says what happened and offers one button to fix it.
- Visible labels (no placeholder-only), errors under the field, focus moves to the first invalid field.
- Keyboard-complete: tab order matches visual order, visible focus rings, Esc closes the sheet.
- Body text ≥16px, contrast ≥4.5:1, color never the only signal (icon + text on every state).
- Buttons disable during async work with a spinner; feedback within 100ms of a click.

## 4. Visual style

Chosen with `ui-ux-pro-max` (fonts, fintech rules); default palette suggestion rejected as off-brief. All values are tokens in one place (`app/globals.css` CSS variables + Tailwind theme) so tuning after the first click-through is cheap.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F5FAF6` | page background |
| `--surface` | `#FFFFFF` | cards, sheet |
| `--ink` | `#0B2318` | primary text |
| `--muted` | `#4A5D53` | secondary text |
| `--cta` | `#9BE15D` | primary button (text `--ink`) |
| `--brand` | `#0F5132` | logo mark, timeline fill, success |
| `--pending` | `#B45309` | waiting / unknown |
| `--danger` | `#DC2626` | failed step + action |
| `--border` | `#D7E5DC` | card borders |

- Fonts: IBM Plex Sans + IBM Plex Sans Thai (headings and body), IBM Plex Mono for hashes and references. Loaded via `next/font/google` with `display: swap`. Amounts use `font-variant-numeric: tabular-nums`.
- Evidence tags: `SIMULATED` = dashed grey outline pill; `TESTNET · Fuji` = solid outline pill.
- Components: shadcn/ui (Radix, accessible) + Lucide icons. No emoji icons.
- Light mode only.
- Spacing on a 4/8px scale; max content width ~1040px; two-column on ≥1024px, single column below.

### Motion (wow sequence)

Each piece 150–300ms, ease-out, transform/opacity only; whole sequence about 6 seconds driven by real status changes, not a fixed timer.

1. Timeline line grows downward in `--brand` as each step completes; check icon draws in.
2. On settlement: a small token dot travels along the line segment; tx hash and "View on Snowtrace ↗" fade in.
3. On completion: THB amount counts up, receipt card slides up, "Recipient notified" chip pops.

`prefers-reduced-motion`: all of the above become instant state changes.

## 5. Code organisation

Paths are relative to the backend repo root (section 7); `@/*` maps to `src/*`.

```
src/app/
  layout.tsx                 header, fonts, LanguageProvider (replaces backend placeholder)
  globals.css                tokens
  page.tsx                   Send + Review (client state machine: step 1 | 2) (replaces placeholder)
  transfers/[id]/page.tsx    Track + Receipt
src/components/
  brand/Logo.tsx
  send/       AmountField, RecipientCard, EstimateCard
  review/     ReviewCard, ExpiryCountdown, BankSheet
  track/      Timeline, TimelineStep, EvidenceTag, Receipt, NotifiedChip, Details
  demo/       PresenterPanel
  ui/         shadcn primitives
src/web/                     all frontend logic, kept apart from backend src/lib
  api/types.ts        contract types + zod schemas (snapshot, quote, recipient, session, error envelope)
  api/client.ts       ApiClient interface
  api/real.ts         fetch implementation
  api/mock.ts         contract-following fake backend
  api/index.ts        per-endpoint mock/real routing
  money.ts            BigInt minor-unit parse/format + fixture estimate
  status.ts           snapshot -> timeline view model + copy keys
  idempotency.ts      stable keys in sessionStorage
  useTransferPolling.ts
  i18n/en.ts, th.ts, useT.ts
tests/web/                   frontend unit tests (backend vitest already includes tests/**)
```

Frontend touches only the `src/app` pages/layout/globals above, `src/components/`, `src/web/`, `tests/web/`, and the Tailwind/shadcn config files. It never touches `src/app/api/`, `src/server/`, `src/db/`, `src/domain/`, `src/lib/`, `src/settlement/` or `db/`. Frontend code may not import backend modules (they are `server-only`); it has its own contract types.

### ApiClient

```ts
interface ApiClient {
  createSession(): Promise<Session>;
  getRecipients(): Promise<Recipient[]>;
  createQuote(input: { recipientId: string; sourceDebitMinor: string }): Promise<Quote>;
  createTransfer(input: { quoteId: string; purpose: "PERSONAL_REMITTANCE"; demoScenario: DemoScenario }, key: string): Promise<TransferSnapshot>;
  getTransfer(id: string): Promise<TransferSnapshot>;
  simulateFunding(id: string, key: string): Promise<TransferSnapshot>;
  advance(id: string): Promise<TransferSnapshot>;
  retryPayout(id: string, key: string): Promise<TransferSnapshot>;
}
```

All amount fields stay integer strings end to end; only `money.ts` converts them to display text.

### Room for the real APIs

Endpoints switch from mock to real individually, because owners finish at different times:

```
NEXT_PUBLIC_REAL_ENDPOINTS=session,recipients,quotes   # unlisted groups stay mock
```

| Group | Endpoints | Owner |
|---|---|---|
| `session` | `POST /api/demo/session` | 2 |
| `recipients` | `GET /api/recipients` | 2 |
| `quotes` | `POST /api/quotes` | 2 |
| `transfers` | `POST /api/transfers`, `GET /api/transfers/{id}`, `POST /api/demo/transfers/{id}/funding`, `.../advance`, `.../payout-retry` | 3 (settlement fields filled by 4's module inside `advance`) |

- Switch order is fixed by the backend: it only accepts a quote stored in its own DB under the same `demo_session` cookie. So `session`, `recipients` and `quotes` flip to real together (person 2), and `transfers` flips after them. Real quote + mock transfer works; mock quote + real transfer never does. Until person 2 lands, the mock is the daily driver; backend `scripts/demo-seed.mjs` + `scripts/demo-flow.sh` show real snapshots for reference.
- `real.ts` calls relative `/api/...` paths (same origin, so the backend's `Origin` check and session cookie work with no CORS or proxy). It sends `Content-Type: application/json`, `Idempotency-Key` where required, `credentials: "same-origin"`, and `{}` as the body of every body-less POST (backend bodies are strict empty objects); unwraps `{ data, meta }`; throws a typed `ApiError` with `code`, `retryable`, `fieldErrors`, `requestId`. Any 2xx is success (`advance` returns 202 while work is pending).
- In real mode every response is validated with the zod schemas. Mismatch in development: red toast naming the endpoint and field; in production: log and continue with the hold state.
- Mixed mode (real quote, mock transfer) works because the client caches each returned quote for the mock to resolve.
- Error code → UI action: `INVALID_INPUT` field errors; `UNAUTHENTICATED` new session; `QUOTE_EXPIRED` "Get new quote"; `IDEMPOTENCY_CONFLICT` / `QUOTE_ALREADY_ACCEPTED` / `INVALID_STATE` re-read the transfer and render it; `RATE_LIMITED` back off (respect `Retry-After`); `DEPENDENCY_UNAVAILABLE` keep state, retry read; `INTERNAL_ERROR` show `requestId`.
- A lost mutation response never triggers a new intent: the same key is replayed or the transfer is re-read.

### Mock backend

- Implements the same ApiClient and returns contract-shaped snapshots (same keys, same status order, `version` increments, events appended).
- Uses `money.ts` fixture math, so mock and real amounts match.
- Each `advance` call moves at most one step, with a short artificial delay so the animation is visible.
- Honours `demoScenario`.
- Persists to `localStorage`, so refresh-resume can be rehearsed in mock mode.
- Never fakes chain evidence: tx hash shown as `mock-…`, `explorerUrl` null, no Snowtrace link, `MOCK DATA` banner visible.
- On completion, the mock sends the ntfy push from the browser (`fetch` POST to `https://ntfy.sh/<NEXT_PUBLIC_NTFY_TOPIC>`) and sets `notification.status` to `SENT` (with `sentAt`) or `FAILED`; with no topic it sets `DISABLED`. Before completion it is `NOT_STARTED`. Same enum as the real backend, so the phone moment can be rehearsed in mock mode.

### Money

- `parseUsdInput("10.5")` → `"1050"`; rejects signs, exponents, more than two decimals, out-of-range.
- Estimate (fixture `fixture-us-th-v1`): fee = ceil(2% of debit, cents); principal = debit − fee; THB satang = floor(principal × 35 × 100 / 100). $10.00 → fee $0.20, principal $9.80, ฿343.00.
- Display: BigInt split into whole/fraction, whole part formatted with `Intl.NumberFormat` (`en-US` or `th-TH`), currency symbol prefix. No floating-point money math anywhere.

### Idempotency and polling

- Opening the bank sheet creates a UUID stored as `centme:key:transfer:<quoteId>`; retries reuse it. After transfer creation, funding uses `centme:key:funding:<transferId>`; payout retry uses `centme:key:payout:<transferId>:<attempt>`.
- Confirm sequence: `createTransfer` → `router.replace('/transfers/<id>')` → `simulateFunding`. If funding's response is lost, the track page shows **Finish payment** with the stored key.
- `useTransferPolling`: `GET` every 2s; call `advance` only while `nextAction === "ADVANCE"`, one in flight; back off 2 → 4 → 8 → 10s on errors; ignore snapshots with a lower `version`; stop on `NONE`; surface the retry button on `RETRY_PAYOUT`.

### i18n

- Dictionary files `en.ts` / `th.ts` with identical keys; `useT()` returns a typed lookup. Language stored in `localStorage` (wrapped in try/catch), default English.
- Numbers and dates formatted per language with `Intl`. Server timestamps are UTC; display in the browser's time zone.

## 6. Phone notification (ntfy)

- Presenter's iPhone runs the free ntfy app subscribed to a long random topic (env `NTFY_TOPIC` server-side, `NEXT_PUBLIC_NTFY_TOPIC` for mock mode). The phone plays the recipient.
- Message on completion: "Demo Recipient received ฿343.00 · USDC settled on Avalanche Fuji · THB payout simulated." Synthetic data only; ntfy.sh topics are public to anyone who guesses the name.
- Frontend shows the chip from snapshot evidence only.

**Landed in backend v1:** every snapshot has `notification: { channel: "NTFY", status: "NOT_STARTED" | "PENDING" | "SENT" | "FAILED" | "DISABLED", sentAt: string | null }` (always present). The `/advance` call that completes the transfer sends one push server-side (`NTFY_TOPIC` env); a failed push never blocks completion and a later `/advance` retries it.

The chip shows only on `SENT`. `NOT_STARTED`, `PENDING`, `FAILED` and `DISABLED` show nothing: the transfer is complete either way, and a failed push is not the sender's problem.

## 7. App location and tooling

The backend (person 3) is a standalone, API-only Next.js app in `4rtem1sss/U-hackathon_backend`. Its mutation routes require a same-origin `Origin` header and the `demo_session` cookie, and it sends no CORS headers. So the frontend lives **inside that repo** as the same Next.js app: one origin, one deploy, nothing to configure.

- Branch: `frontend-merge-part3`, created from `part3/backend-core`; merged after person 3 merges his branch. Spec and plan docs stay in the U-Hackathon repo.
- Needs push access to the backend repo (or a fork + PR). Tell person 3 before starting: frontend adds Tailwind v4 + shadcn/ui config and replaces the placeholder `src/app/layout.tsx` and `src/app/page.tsx`.
- Use the backend's toolchain as is: pnpm 10.28 (`packageManager`), Next 16.4.1, React 19.3, zod 4, vitest 5. Node: backend pins 22; the dev machine has 24, which pnpm only warns about. Install pnpm with `npm i -g pnpm@10.28.0`.
- Next 16 has breaking changes (see the repo's `AGENTS.md`): read `node_modules/next/dist/docs/` before writing framework code.
- The backend tsconfig is strict (`strict`, `noUncheckedIndexedAccess`, tests type-checked) and CI runs lint, typecheck, test and build. All frontend code and tests must pass all four.
- Frontend adds: `tailwindcss` v4 + `@tailwindcss/postcss`, shadcn (button, dialog, sonner), `lucide-react`. No other global config changes.

## 8. Testing and walkthrough

- Vitest unit tests in `tests/web/`: `money.ts` (parse rules, fee rounding up, THB floor, $1 and $100 bounds, $10 → ฿343.00), `status.ts` (every status and substatus maps to a defined view model, unknown status → hold), zod schemas accept the contract's documented examples **and a fixture copied from backend `toSnapshot` output** (so backend drift fails CI).
- Browser walkthrough checklist (`docs/walkthrough.md`), run in mock mode first, then again with real endpoints:
  1. Happy path end to end; receipt amounts reconcile with the review screen.
  2. Funding declined scenario stops at step 1, no chain step.
  3. Payout failed → Retry payout → completed; tx hash unchanged.
  4. Refresh mid-transfer resumes on the same step.
  5. Double-click Confirm creates one transfer.
  6. Let the quote expire on review → Get new quote.
  7. Invalid amounts ($0.50, $100.01, `1e2`, `-5`) show inline errors.
  8. TH toggle on every screen; no overflow or untranslated strings.
  9. Keyboard-only run; reduced-motion run.
  10. Open the receipt URL in an incognito window: must not show another session's transfer.
  11. iPhone receives the push on completion.
- Design QA with `impeccable` (`audit` then `polish`) after the first full click-through.

## 9. Design skills during implementation

- `ui-ux-pro-max`: palette, font and UX-rule lookups (used for this spec; re-check tokens if the logo arrives with its own colors).
- `impeccable`: build and refine the screens (`craft` for first build, `critique`/`audit`/`polish` for iteration). Not run on the same request as `ui-ux-pro-max`.

## 10. Out of scope

Dark mode, recipient management, account/login screens, reverse THB→USD direction, wallet connection, Gmail receipts (only if time remains after the walkthrough passes), sponsor add-ons (Tokenomist, ElevenLabs) unless the core demo passes first.

## 11. Build order

1. `src/web/` core: money, status, api types + zod, mock, i18n (no framework needed).
2. Join the backend repo on `frontend-merge-part3` (section 7); add Tailwind/shadcn; tokens, fonts, header, logo placeholder.
3. Screen 1 → 2 → bank sheet → screen 3 with mock data; full click-through.
4. Presenter panel, failure states, ntfy from mock.
5. Motion (wow sequence).
6. Flip endpoint groups to real as each owner lands them; run walkthrough.
7. `impeccable` audit + polish; record backup run.
