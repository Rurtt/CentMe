# CentMe UI Polish + Fillable Recipient Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the presenter type a Thai recipient on page 1 (saved by the backend), cut repeated "mock/simulated" copy down to one footer line, and rebuild the header (bigger, Fuji status pill, SVG flag language toggle).

**Architecture:** One shared validation module in `src/domain/recipients.ts` is used by both the new `POST /api/recipients` route and the page-1 form. The web API client gains `createRecipient` in real, mock and routed clients. Copy and header changes are presentational only.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5.9, zod 4, Tailwind 4, vitest 5, pnpm 10, Postgres (`pg`).

**Spec:** `D:\U-Hackathon\docs\superpowers\specs\2026-10-16-centme-ui-polish-recipient-design.md`

**Repo:** all code paths below are in `D:\U-hackathon_backend`. Run every command from that directory. The plan file and spec live in `D:\U-Hackathon`.

## Global Constraints

- Banks: `KBANK` Kasikorn Bank, `SCB` SCB, `BBL` Bangkok Bank, `KTB` Krungthai, `BAY` Krungsri, `TTB` ttb, `GSB` GSB.
- Name: trimmed, 1-60 chars, letters (any script, incl. Thai combining marks), spaces, `.`, `-`, `'`.
- Account number: digits only after stripping spaces and `-`, length 10-12.
- Stored `account_display` is `"••" + last 4 digits`. The full account number is never stored or logged.
- Max 10 recipients per session (seeded one included). Over the cap: `409 RECIPIENT_LIMIT`.
- Invalid input uses the existing `INVALID_INPUT` code, which this backend maps to **400** (the spec said 422; the existing error table wins).
- Footer line (EN): "Bank steps are simulated. USDC settles on Avalanche Fuji testnet."
- Flags are inline SVG, never emoji (Windows Chrome renders flag emoji as letters).
- Header: `h-20`, wordmark `h-11`, container `max-w-[1040px] px-4 sm:px-6`, toggle 40px tall (`h-10`), pill and toggle text 14px medium.
- Selected recipient id is kept in `sessionStorage` under `centme:recipientId`.
- No change to quote, transfer, or settlement logic.

## Review Focus

1. Someone types a real 10-digit account number on stage: the DB row, the API response, and the server logs must contain only the last 4 digits. (Test in Task 2, step 1: `full account number is not stored`.)
2. Name with Thai vowels/tone marks ("สมชาย ใจดี", "น้ำฝน") must pass validation; a name of only spaces must fail. (Test in Task 1.)
3. Account number typed with dashes or spaces ("123-4-56789-0") must be accepted and normalized. (Test in Task 1.)
4. Refresh after picking a new recipient keeps that recipient; a stale stored id (new session, reset mock data) falls back to the first recipient instead of an empty card. (Test in Task 4, `pickRecipient`.)
5. In mock mode, a transfer created for a newly typed recipient shows that recipient's name on tracking/receipt, not "Demo Recipient". (Test in Task 3, mock test.)

---

### Task 0: Branch

- [ ] **Step 1: Create the work branch from the current integration branch**

```bash
git switch "part-2&3-merged"
git pull --ff-only
git switch -c feat/ui-polish-recipient
```

- [ ] **Step 2: Baseline**

Run: `pnpm typecheck && pnpm test`
Expected: both pass (DB tests are skipped when no test database is configured; note how many ran).

---

### Task 1: Shared recipient rules (`src/domain/recipients.ts`)

**Files:**
- Create: `src/domain/recipients.ts`
- Test: `tests/domain/recipients.test.ts`

**Interfaces:**
- Produces:
  - `THAI_BANKS: readonly { code: BankCode; label: string }[]`
  - `type BankCode = "KBANK" | "SCB" | "BBL" | "KTB" | "BAY" | "TTB" | "GSB"`
  - `bankLabel(code: BankCode): string`
  - `normalizeAccountNumber(raw: string): string` (strips spaces and `-`)
  - `accountDisplayFromNumber(digits: string): string` (returns `"••" + last 4`)
  - `newRecipientBody` (zod strict object: `{ name: string; bankCode: BankCode; accountNumber: string }`, output has trimmed name and normalized digits)
  - `type NewRecipientBody = z.infer<typeof newRecipientBody>`
  - `RECIPIENT_LIMIT = 10`

- [ ] **Step 1: Write the failing test**

```ts
// tests/domain/recipients.test.ts
import { describe, expect, it } from "vitest";
import {
  accountDisplayFromNumber,
  bankLabel,
  newRecipientBody,
  normalizeAccountNumber,
  THAI_BANKS,
} from "@/domain/recipients";

const ok = (input: unknown) => newRecipientBody.safeParse(input);
const base = { name: "Somchai Jaidee", bankCode: "KBANK", accountNumber: "1234567890" };

describe("recipient rules", () => {
  it("lists the seven Thai banks", () => {
    expect(THAI_BANKS.map((b) => b.code)).toEqual(["KBANK", "SCB", "BBL", "KTB", "BAY", "TTB", "GSB"]);
    expect(bankLabel("BAY")).toBe("Krungsri");
  });

  it("accepts Latin and Thai names, trimming whitespace", () => {
    expect(ok({ ...base, name: "  Somchai Jaidee " }).data?.name).toBe("Somchai Jaidee");
    expect(ok({ ...base, name: "สมชาย ใจดี" }).success).toBe(true);
    expect(ok({ ...base, name: "น้ำฝน" }).success).toBe(true);
    expect(ok({ ...base, name: "O'Neil-Smith Jr." }).success).toBe(true);
  });

  it("rejects empty, whitespace-only, too long, and symbol names", () => {
    expect(ok({ ...base, name: "" }).success).toBe(false);
    expect(ok({ ...base, name: "   " }).success).toBe(false);
    expect(ok({ ...base, name: "a".repeat(61) }).success).toBe(false);
    expect(ok({ ...base, name: "Bob <script>" }).success).toBe(false);
    expect(ok({ ...base, name: "Agent 007" }).success).toBe(false);
  });

  it("normalizes account numbers with dashes and spaces", () => {
    expect(normalizeAccountNumber("123-4-56789-0")).toBe("1234567890");
    expect(ok({ ...base, accountNumber: "123 4 56789 0" }).data?.accountNumber).toBe("1234567890");
  });

  it("accepts 10 to 12 digits only", () => {
    expect(ok({ ...base, accountNumber: "123456789" }).success).toBe(false);
    expect(ok({ ...base, accountNumber: "123456789012" }).success).toBe(true);
    expect(ok({ ...base, accountNumber: "1234567890123" }).success).toBe(false);
    expect(ok({ ...base, accountNumber: "12345abcde" }).success).toBe(false);
  });

  it("rejects unknown banks and extra fields", () => {
    expect(ok({ ...base, bankCode: "CITI" }).success).toBe(false);
    expect(ok({ ...base, accountDisplay: "x" }).success).toBe(false);
  });

  it("builds a last-4 display", () => {
    expect(accountDisplayFromNumber("1234567890")).toBe("••7890");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/domain/recipients.test.ts`
Expected: FAIL, cannot resolve `@/domain/recipients`.

- [ ] **Step 3: Implement**

```ts
// src/domain/recipients.ts
import { z } from "zod";

/** Banks offered in the demo recipient form. Labels are what the UI and receipts show. */
export const THAI_BANKS = [
  { code: "KBANK", label: "Kasikorn Bank" },
  { code: "SCB", label: "SCB" },
  { code: "BBL", label: "Bangkok Bank" },
  { code: "KTB", label: "Krungthai" },
  { code: "BAY", label: "Krungsri" },
  { code: "TTB", label: "ttb" },
  { code: "GSB", label: "GSB" },
] as const;

export type BankCode = (typeof THAI_BANKS)[number]["code"];

const BANK_CODES = THAI_BANKS.map((b) => b.code) as [BankCode, ...BankCode[]];

/** Per-session cap, the seeded demo recipient included. */
export const RECIPIENT_LIMIT = 10;

export function bankLabel(code: BankCode): string {
  return THAI_BANKS.find((b) => b.code === code)?.label ?? code;
}

export function normalizeAccountNumber(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

/** Only the last 4 digits are ever kept; someone may type a real account number on stage. */
export function accountDisplayFromNumber(digits: string): string {
  return `••${digits.slice(-4)}`;
}

/** `POST /api/recipients` body. Extra fields are rejected. */
export const newRecipientBody = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[\p{L}\p{M} .'-]+$/u),
  bankCode: z.enum(BANK_CODES),
  accountNumber: z
    .string()
    .max(40)
    .transform(normalizeAccountNumber)
    .pipe(z.string().regex(/^\d{10,12}$/)),
});
export type NewRecipientBody = z.infer<typeof newRecipientBody>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/domain/recipients.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/recipients.ts tests/domain/recipients.test.ts
git commit -m "feat(domain): shared Thai recipient rules"
```

---

### Task 2: `POST /api/recipients`

**Files:**
- Modify: `src/lib/errors.ts` (add `RECIPIENT_LIMIT` after `INVALID_STATE`)
- Modify: `src/server/recipients.ts` (add `createSessionRecipient`)
- Modify: `src/app/api/recipients/route.ts` (add `POST`)
- Modify: `D:\U-Hackathon\docs\api-contract.md` section 3 (+ section 9 error table)
- Test: `tests/api/recipients.test.ts`

**Interfaces:**
- Consumes: `newRecipientBody`, `bankLabel`, `accountDisplayFromNumber`, `RECIPIENT_LIMIT` from Task 1; existing `insertRecipient`, `withTransaction`, `requireSession`, `parseJsonBody`, `ok`, `withHandler`, `allowedOrigins`, `newId`, `ID_PREFIX`.
- Produces: `createSessionRecipient(input: { ownerId: string; body: NewRecipientBody }): Promise<RecipientView>`; HTTP `POST /api/recipients` → `201 { data: RecipientView }`.

  Note: the response `data` is the recipient object itself (like `POST /api/quotes` returns the quote), not `{ recipient }`.

- [ ] **Step 1: Write the failing tests** (append to `tests/api/recipients.test.ts`)

Add imports at the top:

```ts
import { POST as recipientsPOST } from "@/app/api/recipients/route";
import { RECIPIENT_LIMIT } from "@/domain/recipients";
```

then append this block at the end of the file:

```ts
const create = (cookie: string | null, body: unknown, origin?: string | null) =>
  recipientsPOST(
    apiRequest("/api/recipients", { cookie, body, ...(origin === undefined ? {} : { origin }) }),
    undefined,
  );

const valid = { name: "สมชาย ใจดี", bankCode: "KBANK", accountNumber: "123-4-56789-0" };

describeDb("POST /api/recipients", () => {
  const t = useApiTestDb();

  it("creates a recipient (201) with a last-4 display and lists it", async () => {
    const cookie = await newSessionCookie();
    const res = await create(cookie, valid);
    expect(res.status).toBe(201);
    const { data } = await readJson(res);
    expect(data).toEqual({
      id: expect.stringMatching(/^rcp_/),
      name: "สมชาย ใจดี",
      country: "TH",
      currency: "THB",
      bankLabel: "Kasikorn Bank",
      accountDisplay: "••7890",
      isSynthetic: true,
    });
    const listed = (await readJson(await list(cookie))).data.recipients;
    expect(listed.map((r: { id: string }) => r.id)).toContain(data.id);
  });

  it("full account number is not stored", async () => {
    const cookie = await newSessionCookie();
    await create(cookie, valid);
    const { rows } = await t.db.pool.query("SELECT row_to_json(r)::text AS j FROM recipients r");
    for (const row of rows) expect(row.j).not.toContain("1234567890");
  });

  it("rejects bad fields with 400 INVALID_INPUT and per-field errors", async () => {
    const cookie = await newSessionCookie();
    const res = await create(cookie, { name: " ", bankCode: "CITI", accountNumber: "12" });
    expect(res.status).toBe(400);
    const { error } = await readJson(res);
    expect(error?.code).toBe("INVALID_INPUT");
    expect(Object.keys(error?.fieldErrors ?? {}).sort()).toEqual(["accountNumber", "bankCode", "name"]);
  });

  it("rejects extra fields", async () => {
    const res = await create(await newSessionCookie(), { ...valid, accountDisplay: "••0000" });
    expect(res.status).toBe(400);
  });

  it("requires a session (401) and a same-origin request (403)", async () => {
    expect((await create(null, valid)).status).toBe(401);
    expect((await create(await newSessionCookie(), valid, "https://evil.example")).status).toBe(403);
  });

  it("keeps recipients private to their session", async () => {
    const a = await newSessionCookie();
    const b = await newSessionCookie();
    const { data } = await readJson(await create(a, valid));
    const bList = (await readJson(await list(b))).data.recipients;
    expect(bList.map((r: { id: string }) => r.id)).not.toContain(data.id);
  });

  it(`caps a session at ${RECIPIENT_LIMIT} recipients (409 RECIPIENT_LIMIT)`, async () => {
    const cookie = await newSessionCookie();
    for (let i = 1; i < RECIPIENT_LIMIT; i++) expect((await create(cookie, valid)).status).toBe(201);
    const res = await create(cookie, valid);
    expect(res.status).toBe(409);
    expect((await readJson(res)).error?.code).toBe("RECIPIENT_LIMIT");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/api/recipients.test.ts`
Expected: FAIL, `POST` is not exported from the route (or, with no test DB configured, the `describeDb` blocks are skipped — in that case set the test DB env as `tests/db/helpers.ts` expects before continuing; do not skip this verification).

- [ ] **Step 3: Add the error code** in `src/lib/errors.ts`, directly after the `INVALID_STATE` entry:

```ts
  RECIPIENT_LIMIT: {
    status: 409,
    retryable: false,
    message: "This demo session already has the maximum number of recipients.",
  },
```

- [ ] **Step 4: Add the service** — replace `src/server/recipients.ts` with:

```ts
import "server-only";
import { getPool, insertRecipient, listRecipients, withTransaction } from "@/db";
import type { RecipientRow } from "@/db/types";
import { accountDisplayFromNumber, bankLabel, RECIPIENT_LIMIT, type NewRecipientBody } from "@/domain/recipients";
import { ApiError } from "@/lib/errors";
import { ID_PREFIX, newId } from "@/lib/ids";
import { requireSession } from "./session";

export interface RecipientView {
  id: string;
  name: string;
  country: string;
  currency: string;
  bankLabel: string;
  accountDisplay: string;
  isSynthetic: boolean;
}

/** Public shape only (no ownerId/createdAt). */
function toView(r: RecipientRow): RecipientView {
  return {
    id: r.id,
    name: r.name,
    country: r.country,
    currency: r.currency,
    bankLabel: r.bankLabel,
    accountDisplay: r.accountDisplay,
    isSynthetic: r.isSynthetic,
  };
}

/** The session owner's recipients. */
export async function listSessionRecipients(req: Request): Promise<RecipientView[]> {
  const { ownerId } = await requireSession(req);
  const rows = await listRecipients(getPool(), ownerId);
  return rows.map(toView);
}

/**
 * Add a synthetic recipient typed in during the demo. Only the last 4 account
 * digits are stored. The advisory lock serializes one owner's requests so two
 * concurrent creates cannot both pass the cap.
 */
export async function createSessionRecipient(input: { ownerId: string; body: NewRecipientBody }): Promise<RecipientView> {
  const { ownerId, body } = input;
  const row = await withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 1))", [ownerId]);
    const { rows } = await client.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM recipients WHERE owner_id = $1",
      [ownerId],
    );
    if ((rows[0]?.n ?? 0) >= RECIPIENT_LIMIT) throw new ApiError("RECIPIENT_LIMIT");
    return insertRecipient(client, {
      id: newId(ID_PREFIX.recipient),
      ownerId,
      name: body.name,
      bankLabel: bankLabel(body.bankCode),
      accountDisplay: accountDisplayFromNumber(body.accountNumber),
    });
  });
  return toView(row);
}
```

Before saving, confirm `RecipientRow` is exported from `src/db/types.ts` (`grep -n "RecipientRow" src/db/types.ts`) and that `withTransaction` accepts a callback without options (see its signature in `src/db/tx.ts`; `createQuote` passes options as the second argument — copy what it passes if the second argument is required). The `new ApiError("RECIPIENT_LIMIT")` call matches how `quotes.ts` throws `new ApiError("UNSUPPORTED_CORRIDOR")`.

- [ ] **Step 5: Add the route handler** — replace `src/app/api/recipients/route.ts` with:

```ts
import { newRecipientBody } from "@/domain/recipients";
import { ok, parseJsonBody, withHandler } from "@/lib/http";
import { allowedOrigins, createSessionRecipient, listSessionRecipients, requireSession } from "@/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The caller's recipients (api-contract section 3). */
export const GET = withHandler(async (req) => ok({ recipients: await listSessionRecipients(req) }));

/** Add a synthetic recipient typed in during the demo (api-contract section 3). */
export const POST = withHandler(
  async (req) => {
    const session = await requireSession(req);
    const body = await parseJsonBody(req, newRecipientBody);
    return ok(await createSessionRecipient({ ownerId: session.ownerId, body }), { status: 201 });
  },
  { allowedOrigins },
);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm vitest run tests/api/recipients.test.ts && pnpm typecheck`
Expected: PASS (3 old + 7 new), typecheck clean.

- [ ] **Step 7: Update the contract doc** — in `D:\U-Hackathon\docs\api-contract.md`, replace the sentence "No recipient creation, contact search or real bank onboarding is required for v1." with:

~~~markdown
`POST /api/recipients` adds a synthetic recipient typed in during the demo (same-origin, session required, extra fields rejected):

```json
{ "name": "สมชาย ใจดี", "bankCode": "KBANK", "accountNumber": "123-4-56789-0" }
```

- `name`: trimmed, 1-60 chars; letters (any script), spaces, `.`, `-`, `'`.
- `bankCode`: `KBANK` | `SCB` | `BBL` | `KTB` | `BAY` | `TTB` | `GSB` (server sets `bankLabel`).
- `accountNumber`: 10-12 digits after removing spaces and `-`. Only `"••" + last 4` is stored and returned as `accountDisplay`; the full number is never stored or logged.
- Returns `201` with `data` = the recipient (same shape as one `GET` item). `400 INVALID_INPUT` with `fieldErrors.{name|bankCode|accountNumber}`; `409 RECIPIENT_LIMIT` after 10 recipients per session.

No contact search or real bank onboarding in v1.
~~~

Add a `RECIPIENT_LIMIT | 409 | false` row to the section 9 error table, matching that table's existing format. If the backend repo has its own copy (`ls docs/api-contract.md` in `D:\U-hackathon_backend`), make the same edit there.

- [ ] **Step 8: Commit** (backend repo, then docs repo)

```bash
git add src/lib/errors.ts src/server/recipients.ts src/app/api/recipients/route.ts tests/api/recipients.test.ts
git commit -m "feat(api): POST /api/recipients for demo-entered recipients"
```

```bash
cd /d/U-Hackathon && git add docs/api-contract.md && git commit -m "docs: api contract adds POST /api/recipients"
```

---

### Task 3: Web API client `createRecipient` (real, mock, routed)

**Files:**
- Modify: `src/web/api/client.ts`
- Modify: `src/web/api/real.ts`
- Modify: `src/web/api/mock.ts`
- Modify: `src/web/api/index.ts`
- Test: `tests/web/api/mock.test.ts`, `tests/web/api/index.test.ts`, `tests/web/api/real.test.ts`

**Interfaces:**
- Consumes: `newRecipientBody`, `bankLabel`, `accountDisplayFromNumber`, `RECIPIENT_LIMIT`, `type BankCode` from Task 1; HTTP route from Task 2.
- Produces:
  - `type CreateRecipientInput = { name: string; bankCode: BankCode; accountNumber: string }` (in `client.ts`)
  - `ApiClient.createRecipient(input: CreateRecipientInput): Promise<Recipient>`
  - Mock: `getRecipients()` returns `[MOCK_RECIPIENT, ...created]`; `createTransfer` uses the quote's recipient.

- [ ] **Step 1: Write the failing tests**

Append to `tests/web/api/mock.test.ts` (inside the existing `describe("mock backend", ...)` block):

```ts
  it("creates recipients with last-4 display and lists them after the seeded one", async () => {
    const api = createMockClient();
    const r = await api.createRecipient({ name: " Somchai ", bankCode: "SCB", accountNumber: "123-4-56789-0" });
    expect(r).toMatchObject({ name: "Somchai", bankLabel: "SCB", accountDisplay: "••7890", isSynthetic: true });
    expect((await api.getRecipients()).map((x) => x.id)).toEqual([MOCK_RECIPIENT.id, r.id]);
  });

  it("rejects invalid recipient input with per-field errors", async () => {
    const api = createMockClient();
    const e = await api.createRecipient({ name: "", bankCode: "SCB", accountNumber: "12" }).catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.code).toBe("INVALID_INPUT");
    expect(Object.keys(e.fieldErrors).sort()).toEqual(["accountNumber", "name"]);
  });

  it("caps recipients at the limit", async () => {
    const api = createMockClient();
    for (let i = 0; i < 9; i++) await api.createRecipient({ name: "A", bankCode: "SCB", accountNumber: "1234567890" });
    const e = await api.createRecipient({ name: "A", bankCode: "SCB", accountNumber: "1234567890" }).catch((x) => x);
    expect(e.code).toBe("RECIPIENT_LIMIT");
  });

  it("puts the quoted recipient on the transfer snapshot", async () => {
    const api = createMockClient();
    const r = await api.createRecipient({ name: "Nong Fon", bankCode: "KTB", accountNumber: "9876543210" });
    const quote = await api.createQuote({ recipientId: r.id, sourceDebitMinor: "1000" });
    const t = await api.createTransfer({ quoteId: quote.id, purpose: "PERSONAL_REMITTANCE", demoScenario: "HAPPY_PATH" }, "k-r");
    expect(t.recipient).toMatchObject({ id: r.id, name: "Nong Fon", bankLabel: "Krungthai", accountDisplay: "••3210" });
  });

  it("forgets created recipients on reset", async () => {
    const api = createMockClient();
    await api.createRecipient({ name: "A", bankCode: "SCB", accountNumber: "1234567890" });
    api.reset();
    expect(await api.getRecipients()).toHaveLength(1);
  });
```

Open `tests/web/api/index.test.ts` and `tests/web/api/real.test.ts`, find the existing tests for `getRecipients` routing and the real client's `createQuote` POST, and add one test each in the same style:
- index: with `recipients: "real"`, `createRecipient` calls the real client; with `"mock"`, the mock client.
- real: `createRecipient` sends `POST /api/recipients` with the JSON body and parses `data` with `RecipientSchema`.

(Copy the fake-client / fake-fetch setup those files already use; both files build test doubles of `ApiClient`, so those doubles also need a `createRecipient` member — add `createRecipient: vi.fn()` or the equivalent stub wherever a full `ApiClient` object literal is built, or typecheck fails.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/web/api`
Expected: FAIL, `api.createRecipient is not a function`.

- [ ] **Step 3: Interface** — in `src/web/api/client.ts` add:

```ts
import type { BankCode } from "@/domain/recipients";

export type CreateRecipientInput = { name: string; bankCode: BankCode; accountNumber: string };
```

and inside `ApiClient`, after `getRecipients`:

```ts
  createRecipient(input: CreateRecipientInput): Promise<Recipient>;
```

- [ ] **Step 4: Real client** — in `src/web/api/real.ts` add `RecipientSchema` to the `./types` import and add after `getRecipients`:

```ts
    createRecipient: (input) => request("POST", "/api/recipients", RecipientSchema, input),
```

- [ ] **Step 5: Routed client** — in `src/web/api/index.ts` after `getRecipients`:

```ts
    createRecipient: (input) => pick("recipients").createRecipient(input),
```

- [ ] **Step 6: Mock client** — in `src/web/api/mock.ts`:

Add the import:

```ts
import { accountDisplayFromNumber, bankLabel, newRecipientBody, RECIPIENT_LIMIT } from "@/domain/recipients";
```

Extend state (old saved state without `recipients` must still load):

```ts
type MockState = {
  counter: number;
  recipients: Recipient[];
  quotes: Record<string, QuoteRecord>;
  transfers: Record<string, TransferRecord>;
  keys: Record<string, KeyRecord>;
};

const emptyState = (): MockState => ({ counter: 0, recipients: [], quotes: {}, transfers: {}, keys: {} });
```

In the state loader, change `if (raw) return JSON.parse(raw) as MockState;` to:

```ts
      if (raw) return { ...emptyState(), ...(JSON.parse(raw) as Partial<MockState>) };
```

Add a helper next to `record(...)`:

```ts
  const allRecipients = (): Recipient[] => [MOCK_RECIPIENT, ...state.recipients];
  const findRecipient = (id: string) => allRecipients().find((r) => r.id === id) ?? null;
```

Replace `getRecipients` and add `createRecipient`:

```ts
    async getRecipients() {
      return clone(allRecipients());
    },

    async createRecipient(input) {
      const parsed = newRecipientBody.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "_")] ??= issue.message;
        throw fail(400, "INVALID_INPUT", "The request input is invalid.", fieldErrors);
      }
      if (allRecipients().length >= RECIPIENT_LIMIT) {
        throw fail(409, "RECIPIENT_LIMIT", "This demo session already has the maximum number of recipients.");
      }
      const r: Recipient = {
        id: nextId("rcp_mock"),
        name: parsed.data.name,
        country: "TH",
        currency: "THB",
        bankLabel: bankLabel(parsed.data.bankCode),
        accountDisplay: accountDisplayFromNumber(parsed.data.accountNumber),
        isSynthetic: true,
      };
      state.recipients.push(r);
      save();
      return clone(r);
    },
```

In `createQuote`, change the first line to:

```ts
      if (!findRecipient(recipientId)) throw fail(404, "NOT_FOUND", "Recipient not found.");
```

In `createTransfer`, replace the `recipient: { id: MOCK_RECIPIENT.id, ... }` block with:

```ts
        recipient: (() => {
          // A quote from the real backend (mixed modes) has a recipient the mock never saw.
          const r = findRecipient(q.quote.recipientId) ?? MOCK_RECIPIENT;
          return { id: r.id, name: r.name, bankLabel: r.bankLabel, accountDisplay: r.accountDisplay, isSynthetic: true };
        })(),
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm vitest run tests/web && pnpm typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/web/api tests/web/api
git commit -m "feat(web): createRecipient in real, mock and routed API clients"
```

---

### Task 4: Fillable recipient on page 1

**Files:**
- Create: `src/web/recipientChoice.ts` (pure selection helper)
- Create: `src/components/send/RecipientForm.tsx`
- Modify: `src/components/send/RecipientCard.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/web/i18n/en.ts`, `src/web/i18n/th.ts`, `src/web/i18n/errorText.ts`
- Test: `tests/web/recipientChoice.test.ts`

**Interfaces:**
- Consumes: `api.createRecipient`, `CreateRecipientInput` (Task 3); `THAI_BANKS`, `newRecipientBody`, `type BankCode` (Task 1); `browserStorage("session")`.
- Produces:
  - `RECIPIENT_KEY = "centme:recipientId"`
  - `pickRecipient(list: Recipient[], storedId: string | null): Recipient | null`
  - `<RecipientForm onSaved(r: Recipient): void; onCancel(): void />`
  - `<RecipientCard recipient failed onChange(r: Recipient): void />`

- [ ] **Step 1: Write the failing test**

```ts
// tests/web/recipientChoice.test.ts
import { describe, expect, it } from "vitest";
import type { Recipient } from "@/web/api/types";
import { pickRecipient } from "@/web/recipientChoice";

const r = (id: string): Recipient => ({
  id, name: id, country: "TH", currency: "THB", bankLabel: "SCB", accountDisplay: "••0001", isSynthetic: true,
});

describe("pickRecipient", () => {
  it("uses the stored id when it is in the list", () => {
    expect(pickRecipient([r("a"), r("b")], "b")?.id).toBe("b");
  });
  it("falls back to the first recipient for a stale or missing id", () => {
    expect(pickRecipient([r("a"), r("b")], "gone")?.id).toBe("a");
    expect(pickRecipient([r("a")], null)?.id).toBe("a");
  });
  it("returns null for an empty list", () => {
    expect(pickRecipient([], "a")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/web/recipientChoice.test.ts`
Expected: FAIL, cannot resolve `@/web/recipientChoice`.

- [ ] **Step 3: Implement the helper**

```ts
// src/web/recipientChoice.ts
import type { Recipient } from "./api/types";

/** sessionStorage key for the recipient picked on page 1. */
export const RECIPIENT_KEY = "centme:recipientId";

/** The stored recipient if it still exists (new session or mock reset can drop it), else the first one. */
export function pickRecipient(list: Recipient[], storedId: string | null): Recipient | null {
  return list.find((r) => r.id === storedId) ?? list[0] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/web/recipientChoice.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: i18n keys** — add to `src/web/i18n/en.ts` after `"send.recipientLabel"`:

```ts
  "recipient.change": "Change",
  "recipient.formTitle": "New recipient",
  "recipient.name": "Full name",
  "recipient.bank": "Bank",
  "recipient.bankPlaceholder": "Choose a bank",
  "recipient.account": "Account number",
  "recipient.accountHelp": "10-12 digits. Only the last 4 are saved.",
  "recipient.save": "Save recipient",
  "recipient.cancel": "Cancel",
  "recipient.error.name": "Enter a name using letters only (up to 60).",
  "recipient.error.bankCode": "Choose a bank.",
  "recipient.error.accountNumber": "Enter 10 to 12 digits.",
  "error.recipientLimit": "This demo already has 10 recipients. Reset the demo to add more.",
```

and the same keys to `src/web/i18n/th.ts`:

```ts
  "recipient.change": "เปลี่ยน",
  "recipient.formTitle": "ผู้รับใหม่",
  "recipient.name": "ชื่อ-นามสกุล",
  "recipient.bank": "ธนาคาร",
  "recipient.bankPlaceholder": "เลือกธนาคาร",
  "recipient.account": "เลขบัญชี",
  "recipient.accountHelp": "10-12 หลัก ระบบเก็บแค่ 4 หลักท้าย",
  "recipient.save": "บันทึกผู้รับ",
  "recipient.cancel": "ยกเลิก",
  "recipient.error.name": "กรอกชื่อเป็นตัวอักษรเท่านั้น (ไม่เกิน 60 ตัว)",
  "recipient.error.bankCode": "กรุณาเลือกธนาคาร",
  "recipient.error.accountNumber": "กรอกตัวเลข 10 ถึง 12 หลัก",
  "error.recipientLimit": "เดโมนี้มีผู้รับครบ 10 คนแล้ว รีเซ็ตเดโมเพื่อเพิ่มใหม่",
```

In `src/web/i18n/errorText.ts`, before the `RATE_LIMITED` line:

```ts
    if (e.code === "RECIPIENT_LIMIT") return t("error.recipientLimit");
```

- [ ] **Step 6: The form** — create `src/components/send/RecipientForm.tsx`:

```tsx
"use client";

import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { newRecipientBody, THAI_BANKS, type BankCode } from "@/domain/recipients";
import { useApi } from "@/web/api/ApiProvider";
import { isApiError } from "@/web/api/errors";
import type { Recipient } from "@/web/api/types";
import { errorText } from "@/web/i18n/errorText";
import { useT } from "@/web/i18n/LanguageProvider";
import { cn } from "@/web/utils";

type Field = "name" | "bankCode" | "accountNumber";
const FIELDS: Field[] = ["name", "bankCode", "accountNumber"];

const inputClass = (invalid: boolean) =>
  cn(
    "mt-2 h-11 w-full rounded-lg border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring",
    invalid && "border-destructive",
  );

export function RecipientForm({ onSaved, onCancel }: { onSaved(r: Recipient): void; onCancel(): void }) {
  const { api } = useApi();
  const { t } = useT();
  const [name, setName] = useState("");
  const [bankCode, setBankCode] = useState<BankCode | "">("");
  const [accountNumber, setAccountNumber] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, true>>>({});
  const [saving, setSaving] = useState(false);
  const refs = { name: useRef<HTMLInputElement>(null), bankCode: useRef<HTMLSelectElement>(null), accountNumber: useRef<HTMLInputElement>(null) };

  function showErrors(fields: Field[]) {
    setErrors(Object.fromEntries(fields.map((f) => [f, true])));
    refs[fields[0]!]?.current?.focus();
  }

  async function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    const input = { name, bankCode, accountNumber };
    const parsed = newRecipientBody.safeParse(input);
    if (!parsed.success) {
      showErrors(FIELDS.filter((f) => parsed.error.issues.some((i) => i.path[0] === f)));
      return;
    }
    setSaving(true);
    try {
      onSaved(await api.createRecipient({ name, bankCode: parsed.data.bankCode, accountNumber }));
    } catch (err) {
      const bad = isApiError(err, "INVALID_INPUT") ? FIELDS.filter((f) => f in err.fieldErrors) : [];
      if (bad.length > 0) showErrors(bad);
      else toast.error(errorText(err, t));
    } finally {
      setSaving(false);
    }
  }

  const err = (f: Field) =>
    errors[f] ? (
      <p id={`rcp-${f}-error`} className="mt-1 text-sm text-destructive">{t(`recipient.error.${f}` as const)}</p>
    ) : null;

  // Not a <form>: it sits inside the page's send <form>, and nested forms are invalid HTML.
  return (
    <div role="group" aria-labelledby="rcp-form-title" className="mt-2 rounded-xl border bg-background p-4"
      onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") void onSubmit(e); }}>
      <p id="rcp-form-title" className="font-semibold">{t("recipient.formTitle")}</p>
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="rcp-name" className="text-sm font-medium text-muted-foreground">{t("recipient.name")}</label>
          <input id="rcp-name" ref={refs.name} value={name} autoComplete="off" maxLength={60}
            onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: undefined })); }}
            aria-invalid={!!errors.name} aria-describedby={errors.name ? "rcp-name-error" : undefined}
            className={inputClass(!!errors.name)} />
          {err("name")}
        </div>
        <div>
          <label htmlFor="rcp-bank" className="text-sm font-medium text-muted-foreground">{t("recipient.bank")}</label>
          <select id="rcp-bank" ref={refs.bankCode} value={bankCode}
            onChange={(e) => { setBankCode(e.target.value as BankCode); setErrors((x) => ({ ...x, bankCode: undefined })); }}
            aria-invalid={!!errors.bankCode} aria-describedby={errors.bankCode ? "rcp-bankCode-error" : undefined}
            className={inputClass(!!errors.bankCode)}>
            <option value="" disabled>{t("recipient.bankPlaceholder")}</option>
            {THAI_BANKS.map((b) => <option key={b.code} value={b.code}>{b.label}</option>)}
          </select>
          {err("bankCode")}
        </div>
        <div>
          <label htmlFor="rcp-account" className="text-sm font-medium text-muted-foreground">{t("recipient.account")}</label>
          <input id="rcp-account" ref={refs.accountNumber} value={accountNumber} inputMode="numeric" autoComplete="off" maxLength={20}
            onChange={(e) => { setAccountNumber(e.target.value); setErrors((x) => ({ ...x, accountNumber: undefined })); }}
            aria-invalid={!!errors.accountNumber}
            aria-describedby={errors.accountNumber ? "rcp-account-help rcp-accountNumber-error" : "rcp-account-help"}
            className={cn(inputClass(!!errors.accountNumber), "tabular")} />
          <p id="rcp-account-help" className="mt-1 text-sm text-muted-foreground">{t("recipient.accountHelp")}</p>
          {err("accountNumber")}
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>{t("recipient.cancel")}</Button>
        <Button type="button" onClick={(e) => void onSubmit(e)} disabled={saving}>
          {saving && <Loader2 className="animate-spin" aria-hidden />}
          {t("recipient.save")}
        </Button>
      </div>
    </div>
  );
}
```

Note: `onSubmit` takes any event with `preventDefault()`. Calling it on the Enter keydown also stops the browser's implicit submit of the outer send form.

- [ ] **Step 7: The card** — replace `src/components/send/RecipientCard.tsx` with:

```tsx
"use client";

import { useRef, useState } from "react";
import { RecipientForm } from "@/components/send/RecipientForm";
import { Button } from "@/components/ui/button";
import type { Recipient } from "@/web/api/types";
import { initials, maskAccount } from "@/web/format";
import { useT } from "@/web/i18n/LanguageProvider";

type Props = { recipient: Recipient | null; failed: boolean; onChange(r: Recipient): void };

export function RecipientCard({ recipient, failed, onChange }: Props) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const changeRef = useRef<HTMLButtonElement>(null);

  function close() {
    setEditing(false);
    // Return focus after the card re-renders with the button.
    requestAnimationFrame(() => changeRef.current?.focus());
  }

  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{t("send.recipientLabel")}</p>
      {editing ? (
        <RecipientForm onCancel={close} onSaved={(r) => { onChange(r); close(); }} />
      ) : (
        <div className="mt-2 flex items-center gap-4 rounded-xl border bg-background p-4">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary font-semibold text-brand">
            {recipient ? initials(recipient.name) : ""}
          </span>
          {recipient ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{recipient.name}</p>
                <p className="text-sm text-muted-foreground">
                  {recipient.bankLabel} · {maskAccount(recipient.accountDisplay)}
                </p>
              </div>
              <Button ref={changeRef} type="button" variant="outline" onClick={() => setEditing(true)}>
                {t("recipient.change")}
              </Button>
            </>
          ) : failed ? (
            <p className="text-sm text-destructive">{t("error.recipients")}</p>
          ) : (
            <div role="status" aria-label={t("common.loading")} className="h-10 w-48 animate-pulse rounded bg-muted" />
          )}
        </div>
      )}
    </div>
  );
}
```

Check `initials()` in `src/web/format.ts` handles Thai names (it should return the first character(s); if it slices by space-separated words and uppercases, Thai is fine as-is). If `Button` does not forward `ref` (React 19 passes `ref` as a prop to function components, so a shadcn `Button` spreading `...props` works), confirm with typecheck.

- [ ] **Step 8: Wire the page** — in `src/app/page.tsx`:

Add imports:

```ts
import { pickRecipient, RECIPIENT_KEY } from "@/web/recipientChoice";
```

Replace the recipients effect:

```ts
  useEffect(() => {
    api.getRecipients()
      .then((list) => setRecipient(pickRecipient(list, browserStorage("session").getItem(RECIPIENT_KEY))))
      .catch(() => setRecipientFailed(true));
  }, [api]);
```

Add next to `onAmountChange`:

```ts
  function onRecipientChange(r: Recipient) {
    setRecipient(r);
    setQuote(null);
    setChecksBlock(null);
    setServerError(null);
    browserStorage("session").setItem(RECIPIENT_KEY, r.id);
  }
```

and pass it: `<RecipientCard recipient={recipient} failed={recipientFailed} onChange={onRecipientChange} />`.

- [ ] **Step 9: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm vitest run tests/web`
Expected: all pass (the i18n parity test covers the new keys).

- [ ] **Step 10: Commit**

```bash
git add src/web/recipientChoice.ts src/components/send src/app/page.tsx src/web/i18n tests/web/recipientChoice.test.ts
git commit -m "feat(web): fillable recipient on the send page"
```

---

### Task 5: Copy cleanup and footer line

**Files:**
- Modify: `src/web/i18n/en.ts`, `src/web/i18n/th.ts`
- Modify: `src/components/review/ReviewStep.tsx:97-108`
- Modify: `src/components/review/BankSheet.tsx:24-30`
- Modify: `src/components/send/ChecksAlert.tsx`
- Modify: `src/components/send/EstimateCard.tsx:21`
- Modify: `src/components/track/Timeline.tsx:79`
- Modify: `src/components/shell/MockBanner.tsx` (text only, via i18n)
- Modify: `src/app/layout.tsx` (footer, metadata)
- Test: `tests/web/i18n/translate.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: new i18n keys `footer.note`, `send.arrivalTime`, `sheet.desc`. Removed keys: `header.testMode`, `send.timing`, `sheet.simNote`. Keep `tag.SIMULATED`: `EvidenceTag` still types its labels from it.

- [ ] **Step 1: Update the failing test first** — in `tests/web/i18n/translate.test.ts`, replace the `"keeps the required completion copy"` test with:

```ts
  it("keeps the required completion and honesty copy", () => {
    expect(translate("en", "receipt.summary")).toBe("Transfer complete.");
    expect(translate("en", "footer.note")).toBe("Bank steps are simulated. USDC settles on Avalanche Fuji testnet.");
  });
  it("does not mention test mode in the send form copy", () => {
    for (const key of ["send.amountHelp", "send.error.TOO_LARGE"] as const) {
      expect(translate("en", key)).not.toMatch(/test mode/i);
      expect(translate("th", key)).not.toMatch(/ทดสอบ/);
    }
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run tests/web/i18n`
Expected: FAIL (`footer.note` missing, old summary text).

- [ ] **Step 3: Edit `en.ts`**

- Delete `"header.testMode"`, `"send.timing"`, `"sheet.simNote"`.
- Change:

```ts
  "header.mockData": "Mock mode: no Fuji transaction.",
  "send.amountHelp": "USD 1.00 to 100.00",
  "send.error.TOO_LARGE": "The maximum is $100.00.",
  "send.arrivalTime": "About a minute",
  "sheet.desc": "Check the amount, then confirm.",
  "receipt.summary": "Transfer complete.",
  "footer.note": "Bank steps are simulated. USDC settles on Avalanche Fuji testnet.",
```

- [ ] **Step 4: Edit `th.ts`** to match:

- Delete `"header.testMode"`, `"send.timing"`, `"sheet.simNote"`.
- Change:

```ts
  "header.mockData": "โหมดข้อมูลจำลอง: ไม่มีธุรกรรมบน Fuji",
  "send.amountHelp": "USD 1.00 ถึง 100.00",
  "send.error.TOO_LARGE": "สูงสุด $100.00",
  "send.arrivalTime": "ประมาณ 1 นาที",
  "sheet.desc": "ตรวจสอบยอดเงิน แล้วกดยืนยัน",
  "receipt.summary": "โอนเงินสำเร็จ",
  "footer.note": "ขั้นตอนฝั่งธนาคารเป็นการจำลอง ส่วน USDC โอนจริงบน Avalanche Fuji testnet",
```

- [ ] **Step 5: Components**

`ReviewStep.tsx`: in the checks row, replace the `value={...}` span with `value={t("review.checksPassed")}`; remove the `EvidenceTag` import if now unused; change the arrival row to:

```tsx
          <SummaryRow label={t("send.arrival")} value={quote.arrivalEstimate ?? t("send.arrivalTime")} />
```

`EstimateCard.tsx`: `value={t("send.arrivalTime")}`.

`BankSheet.tsx`: `<DialogDescription>{t("sheet.desc")}</DialogDescription>`; replace the "Pay from" row's `<EvidenceTag tag="SIMULATED" />` line by deleting it (keep the `<span>{t("sheet.from")}</span>`); remove the unused import.

`ChecksAlert.tsx`: delete `<EvidenceTag tag="SIMULATED" />` and its import.

`Timeline.tsx` line 79: `{step.tag !== "SIMULATED" && <EvidenceTag tag={step.tag} />}`.

- [ ] **Step 6: Footer + metadata** in `src/app/layout.tsx`:

Make `Footer` a small client component because it needs `useT`. Create `src/components/shell/Footer.tsx`:

```tsx
"use client";

import { useT } from "@/web/i18n/LanguageProvider";

export function Footer() {
  const { t } = useT();
  return (
    <footer className="mx-auto w-full max-w-[1040px] px-4 pb-10 text-center text-sm text-muted-foreground sm:px-6">
      {t("footer.note")}
    </footer>
  );
}
```

In `layout.tsx` import it and render `<Footer />` right after `</main>`. Change metadata description to `"Send USD to Thailand. USDC settles on Avalanche Fuji testnet."`

- [ ] **Step 7: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm vitest run tests/web`
Expected: pass. Then `grep -rn "header.testMode\|send.timing\|sheet.simNote" src` returns nothing.

- [ ] **Step 8: Commit**

```bash
git add src tests/web/i18n
git commit -m "feat(web): one quiet simulated-steps line instead of per-element mock labels"
```

---

### Task 6: Header — size, Fuji pill, SVG flag toggle

**Files:**
- Create: `src/components/shell/Flag.tsx`
- Modify: `src/components/shell/Header.tsx`
- Modify: `src/components/brand/Logo.tsx` (`h-9` → `h-11`)
- Modify: `src/web/i18n/en.ts`, `src/web/i18n/th.ts`

**Interfaces:**
- Consumes: `useApi().modes` (`EndpointModes`), `useT()`.
- Produces: `<Flag country="TH" | "US" className? />`; i18n keys `header.fuji`, `header.mock`, `header.langCode`.

- [ ] **Step 1: i18n** — `en.ts`: replace `"header.langToggle": "ภาษาไทย"` with:

```ts
  "header.langCode": "TH",
  "header.fuji": "Fuji testnet",
  "header.mock": "Mock mode",
```

`th.ts`: replace `"header.langToggle": "English"` with:

```ts
  "header.langCode": "EN",
  "header.fuji": "Fuji testnet",
  "header.mock": "โหมดจำลอง",
```

(`header.langAria` stays in both.)

- [ ] **Step 2: Flags** — create `src/components/shell/Flag.tsx`:

```tsx
/** Inline SVG flags: Windows Chrome draws flag emoji as plain letters. */
export function Flag({ country, className }: { country: "TH" | "US"; className?: string }) {
  const frame = "h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/10";
  if (country === "TH") {
    return (
      <svg viewBox="0 0 9 6" aria-hidden className={`${frame} ${className ?? ""}`}>
        <rect width="9" height="6" fill="#A51931" />
        <rect y="1" width="9" height="4" fill="#F4F5F8" />
        <rect y="2" width="9" height="2" fill="#2D2A4A" />
      </svg>
    );
  }
  const stripe = 10 / 13;
  return (
    <svg viewBox="0 0 19 10" aria-hidden className={`${frame} ${className ?? ""}`}>
      <rect width="19" height="10" fill="#FFFFFF" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} y={i * 2 * stripe} width="19" height={stripe} fill="#B22234" />
      ))}
      <rect width="7.6" height={7 * stripe} fill="#3C3B6E" />
    </svg>
  );
}
```

- [ ] **Step 3: Header** — replace `src/components/shell/Header.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Flag } from "@/components/shell/Flag";
import { Button } from "@/components/ui/button";
import { useApi } from "@/web/api/ApiProvider";
import { useT } from "@/web/i18n/LanguageProvider";
import { cn } from "@/web/utils";

export function Header() {
  const { t, lang, setLang } = useT();
  const { modes } = useApi();
  // Settlement runs in the transfers group, so that flag decides what the pill claims.
  const onFuji = modes.transfers === "real";
  const status = onFuji ? t("header.fuji") : t("header.mock");
  return (
    <header className="border-b bg-card">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        {t("header.skip")}
      </a>
      <div className="mx-auto flex h-20 w-full max-w-[1040px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-3 text-sm font-medium text-foreground sm:px-4"
            aria-label={status}
          >
            <span aria-hidden className={cn("size-2 rounded-full", onFuji ? "bg-done" : "bg-pending")} />
            <span aria-hidden className="hidden sm:inline">{status}</span>
          </span>
          <Button
            variant="outline"
            className="h-10 gap-2 px-3 text-sm font-medium"
            onClick={() => setLang(lang === "en" ? "th" : "en")}
            aria-label={t("header.langAria")}
          >
            <Flag country={lang === "en" ? "TH" : "US"} />
            <span aria-hidden>{t("header.langCode")}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
```

Check that `bg-done` is the green token and `bg-pending` is amber in `src/app/globals.css` (`--done`, `--pending`); if `--done` is not green, use the token that the timeline's done step uses.

- [ ] **Step 4: Logo** — `src/components/brand/Logo.tsx`: change `className="h-9 w-auto"` to `className="h-11 w-auto"`.

- [ ] **Step 5: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all pass. `grep -rn "header.langToggle" src` returns nothing.

- [ ] **Step 6: Commit**

```bash
git add src/components/shell src/components/brand/Logo.tsx src/web/i18n
git commit -m "feat(web): larger header with Fuji status pill and SVG flag language toggle"
```

---

### Task 7: Browser walkthrough

- [ ] **Step 1: Run the app in real mode** (needs DB + env from `.env.local`; same setup as the earlier walkthrough in `D:\U-Hackathon\docs\walkthrough.md`)

Run: `pnpm dev` with `NEXT_PUBLIC_REAL_ENDPOINTS=all` (or the current stage setting).

- [ ] **Step 2: Header** at 1280px and 375px, EN and TH: logo 44px tall; pill shows green dot + "Fuji testnet" (dot only below 640px); toggle shows the Thai flag + "TH" in English mode, the US flag + "EN" in Thai mode; flags render as flags (not letters) in Chrome on Windows; header edges line up with the card edges.

- [ ] **Step 3: Recipient**: click Change, submit empty (three errors, focus on name), type "สมชาย ใจดี", Krungsri, "123-4-56789-0", Save. The card shows "Krungsri · ••7890"; refresh keeps it; get quote; the review row, tracking page, and receipt all show "สมชาย ใจดี".

- [ ] **Step 4: Copy**: in real mode, run `document.body.innerText.match(/mock|simulat|test mode|จำลอง|ทดสอบ/gi)` on the send, review, tracking and receipt screens. Only the footer line may match (and the checks alert when forced from the presenter panel). Note: the receipt's English server-evidence line (`s.receipt.summary`) comes from the backend verbatim; if it says "simulated", leave it and report it to person 3 rather than editing it in the UI.

- [ ] **Step 5: Mock mode** (no `NEXT_PUBLIC_REAL_ENDPOINTS`): banner reads "Mock mode: no Fuji transaction.", pill dot is amber with "Mock mode", recipient form works the same.

- [ ] **Step 6: Record results** in `D:\U-Hackathon\docs\walkthrough.md` (append a dated section), commit in the docs repo, push the branch in the backend repo, and open a PR to `part-2&3-merged` with person 2 as reviewer for Task 2.
