# Demo API contract

Version: proposed v1. Updated: 2026-10-15, Asia/Bangkok. This defines requests, responses and invariants for the four-person team to review before parallel implementation. These endpoints do not exist yet.

Read [current scope](superpowers/specs/2026-10-15-p2p-sandbox-scope-and-next-steps.md) and [team handoff](team-handoff.md). This contract adopts the useful money, idempotency and recovery rules from the [friend's technical specification](research/2026-10-15-friend-handoff/TECHNICAL-SPEC.md), with our current Vercel hosting, simulated fiat rails and resumable execution model.

## 1. Common conventions

- Base path: `/api`. JSON requests/responses use camelCase and `Content-Type: application/json`.
- All amounts are unsigned base-10 integer **strings**. USD uses cents; THB uses satang; test USDC uses 6-decimal base units. Numeric JSON values are reserved for fields such as chain ID, sequence and version.
- Server timestamps are UTC ISO 8601 strings. The frontend formats them for display. Server time controls expiry.
- IDs are opaque strings. The example IDs below are documentation fixtures, not existing records.
- Successful responses use `{ "data": ..., "meta": { "requestId": ..., "apiVersion": "v1", "replayed": false } }`. `replayed` means an idempotent request was replayed, not that blockchain evidence is a video/replay.
- Errors use the error envelope in section 9. No response exposes keys, raw signed transactions, session secrets or database credentials.
- `GET` endpoints read saved records only. They do not start funding, chain broadcasts or payouts.
- No endpoint accepts a client-supplied token address, settlement wallet, FX rate, fee, destination payout amount or arbitrary status override.

## 2. Session and access boundary

Baseline recommendation: a server-issued anonymous demo session cookie, backed by a `demo_sessions` table containing a token hash, owner ID and expiry. Generate an unpredictable token server-side; do not trust a client-supplied owner ID. This avoids a signup/login feature while giving each browser session its own records. Full Supabase Auth is an alternative, not an additional baseline requirement.

`POST /api/demo/session` creates a session if absent; otherwise returns the existing active session. Suggested TTL: 24 hours. Return `Set-Cookie` with `HttpOnly`, `SameSite=Lax`, `Path=/` and `Secure` on HTTPS. Use no cross-origin API access; browser mutations require an allowed same-origin `Origin` header. Apply per-session and global demo-signing limits on the backend. UI visibility is not authorization.

Example `200 OK` body:

```json
{
  "data": {
    "sessionId": "session_demo_001",
    "mode": "DEMO",
    "expiresAt": "2026-10-16T15:00:00Z"
  },
  "meta": { "requestId": "req_session_001", "apiVersion": "v1", "replayed": false }
}
```

The public session ID is not the cookie secret. Scope every recipient fixture, quote, transfer and lookup to the authenticated session owner. Return `404 NOT_FOUND` for another owner's object. Check authorization before returning an idempotency replay. A new browser/session starts a separate demo; it cannot read the first session's transfer merely by knowing its ID.

## 3. Recipients and quote arithmetic

`GET /api/recipients` returns the session's seeded synthetic Thai recipient. No recipient creation, contact search or real bank onboarding is required for v1.

Example `200 OK`:

```json
{
  "data": {
    "recipients": [
      {
        "id": "recipient_demo_th_001",
        "name": "Demo Recipient",
        "country": "TH",
        "currency": "THB",
        "bankLabel": "Demo Thai Bank",
        "accountDisplay": "TEST ACCOUNT 0001",
        "isSynthetic": true
      }
    ]
  },
  "meta": { "requestId": "req_recipients_001", "apiVersion": "v1", "replayed": false }
}
```

This is a fixture selector, not verification that a real bank or account exists. A public-wallet destination is selected from server configuration and is separate from this bank fixture.

Proposed fixed demo policy `fixture-us-th-v1`:

- Sender debit: USD 1.00–100.00 inclusive (`100`–`10000` cents). Reject malformed strings, signs, decimal points, exponent notation and leading zeroes.
- Fee: 2% of total sender debit, rounded up to a whole cent; included in that debit. This is an illustrative fixture, not our proposed business price.
- Conversion principal: debit minus fee. Fixture FX rate: 35 THB per USD.
- THB destination minor units: floor of `principalMinor × rateNumerator × 10^THBDecimals / (rateDenominator × 10^USDDecimals)`.
- Test USDC units: `principalMinor × 10000`. This is simulated 1:1 accounting, not USD-backed token minting or redemption.
- Quote TTL: 300 seconds from server creation. All fixture values and limits are configurable through a versioned server policy, not supplied by the browser.

Use integer/BigInt arithmetic for this fixture. For example, USD 10.00 debit, USD 0.20 fee and USD 9.80 principal produce THB 343.00 and 9.8 test USDC. Do not use binary floating-point money math. Gas is paid separately from a prefunded test-AVAX wallet and is not silently deducted from the accepted quote.

## 4. Create quote

`POST /api/quotes`

Request:

```json
{ "recipientId": "recipient_demo_th_001", "sourceDebitMinor": "1000" }
```

Example `201 Created`:

```json
{
  "data": {
    "id": "quote_demo_001",
    "recipientId": "recipient_demo_th_001",
    "sourceCountry": "US",
    "destinationCountry": "TH",
    "sourceCurrency": "USD",
    "destinationCurrency": "THB",
    "sourceDebitMinor": "1000",
    "feeMinor": "20",
    "conversionPrincipalMinor": "980",
    "fxRateNumerator": "35",
    "fxRateDenominator": "1",
    "destinationNetMinor": "34300",
    "settlementTokenUnits": "9800000",
    "fixtureVersion": "fixture-us-th-v1",
    "createdAt": "2026-10-15T15:00:00Z",
    "expiresAt": "2026-10-15T15:05:00Z",
    "mode": "DEMO",
    "fundingSimulated": true,
    "fxSimulated": true,
    "payoutSimulated": true,
    "settlementMode": "TESTNET",
    "chainId": 43113,
    "arrivalEstimate": null
  },
  "meta": { "requestId": "req_quote_001", "apiVersion": "v1", "replayed": false }
}
```

`arrivalEstimate: null` means production arrival timing is unverified; display "Demo timing only" rather than inventing a bank-delivery promise. The example timestamps are not usable quote validity.

Persist the recipient snapshot and quote amounts. Accepted quotes are immutable and never repriced during a settlement delay. Quotes have a separate lifecycle: `OPEN`, `ACCEPTED`, `EXPIRED`. One quote can create at most one transfer. Reject unsupported extra fields rather than accepting financial overrides.

## 5. Create transfer

`POST /api/transfers`, required header `Idempotency-Key: <client-generated UUID>`.

Request:

```json
{
  "quoteId": "quote_demo_001",
  "purpose": "PERSONAL_REMITTANCE",
  "demoScenario": "HAPPY_PATH"
}
```

Allowed scenarios: `HAPPY_PATH`, `FUNDING_DECLINED`, `PAYOUT_FAILED`. They select local fiat-simulator behavior only; none fabricates a chain transaction or confirmation. The scenario is immutable once accepted.

On first success, return `201 Created` with `data` equal to the transfer snapshot in section 6, initially `FUNDING_PENDING`. Resolve all amounts and the recipient from the accepted server quote. No token movement occurs during transfer creation.

Atomically check quote ownership/expiry, reserve the key, accept the quote, create the transfer and append its initial event. Store a canonical fingerprint of the semantic request fields.

| Repeated request | Result |
| --- | --- |
| Same owner, key and semantic payload | `200 OK`, original transfer's current snapshot, `meta.replayed: true`, no new operation. |
| Same owner/key with different payload | `409 IDEMPOTENCY_CONFLICT`. |
| Already accepted quote under another key | `409 QUOTE_ALREADY_ACCEPTED`, no second transfer. |
| Original accepted request replayed after quote expiry | Return its existing transfer; do not revalidate it as a new expired purchase. |
| New request with expired quote | `410 QUOTE_EXPIRED`, no transfer or settlement. |

Use database uniqueness for `(ownerId, idempotencyKey)` and `quoteId`. A check followed by an unlocked insert is not adequate against simultaneous requests. Reserve mutation keys by owner and operation/transfer, so keys used on funding do not collide with transfer-creation keys.

## 6. Read transfer and shared snapshot

`GET /api/transfers/{id}` returns `200 OK`. Mutating endpoints also return this same snapshot shape under `data`; the frontend should not invent a different model per endpoint.

Example pending snapshot; no blockchain transaction is claimed by its null hash:

```json
{
  "data": {
    "id": "transfer_demo_001",
    "quoteId": "quote_demo_001",
    "status": "SETTLEMENT_PENDING",
    "version": 3,
    "mode": "DEMO",
    "purpose": "PERSONAL_REMITTANCE",
    "demoScenario": "HAPPY_PATH",
    "recipient": {
      "id": "recipient_demo_th_001",
      "name": "Demo Recipient",
      "bankLabel": "Demo Thai Bank",
      "accountDisplay": "TEST ACCOUNT 0001",
      "isSynthetic": true
    },
    "amounts": {
      "sourceCurrency": "USD",
      "destinationCurrency": "THB",
      "sourceDebitMinor": "1000",
      "feeMinor": "20",
      "conversionPrincipalMinor": "980",
      "destinationNetMinor": "34300",
      "settlementTokenUnits": "9800000"
    },
    "funding": { "mode": "SIMULATED", "status": "ACCEPTED", "reference": "funding_demo_001" },
    "fx": { "mode": "SIMULATED", "fixtureVersion": "fixture-us-th-v1", "rateNumerator": "35", "rateDenominator": "1" },
    "settlement": {
      "mode": "TESTNET",
      "status": "PREPARING",
      "chainId": 43113,
      "tokenSymbol": "USDC",
      "tokenAddress": "0x5425890298aed601595a70AB815c96711a31Bc65",
      "tokenDecimals": 6,
      "txHash": null,
      "explorerUrl": null,
      "verifiedAt": null
    },
    "payout": { "mode": "SIMULATED", "status": "NOT_STARTED", "reference": null },
    "events": [
      { "sequence": 1, "status": "FUNDING_PENDING", "createdAt": "2026-10-15T15:01:00Z" },
      { "sequence": 2, "status": "FUNDED_SIMULATED", "createdAt": "2026-10-15T15:01:02Z" },
      { "sequence": 3, "status": "SETTLEMENT_PENDING", "createdAt": "2026-10-15T15:01:03Z" }
    ],
    "lastIssue": null,
    "nextAction": "ADVANCE",
    "receipt": null,
    "createdAt": "2026-10-15T15:01:00Z",
    "updatedAt": "2026-10-15T15:01:03Z"
  },
  "meta": { "requestId": "req_status_001", "apiVersion": "v1", "replayed": false }
}
```

The above is a documentation fixture, not evidence of a real transfer. In live operation, fill `txHash` only from the persisted signed attempt. Fill `verifiedAt` and mark settlement `CONFIRMED` only after checking the actual receipt and exact expected token event. Produce an explorer URL using the verified network's current URL convention; never invent an explorer result.

Required snapshot variants, using the same keys and amount/recipient data:

| Stage | Funding / settlement / payout substatuses | References and receipt |
| --- | --- | --- |
| Newly created `FUNDING_PENDING` | `PENDING` / `NOT_STARTED` / `NOT_STARTED` | All operation references, hash, explorer URL, verification time and receipt are null. `version` is 1; the only event is sequence 1, `FUNDING_PENDING`; `nextAction` is `SIMULATE_FUNDING`. |
| `FUNDED_SIMULATED` | `ACCEPTED` / `NOT_STARTED` / `NOT_STARTED` | Funding reference exists; chain/payout fields and receipt remain null. |
| `FUNDING_FAILED` | `DECLINED` / `NOT_STARTED` / `NOT_STARTED` | Local funding reference exists; no chain hash or payout reference; receipt null. |
| `SETTLEMENT_PENDING` | `ACCEPTED` / `PREPARING`, `BROADCAST` or `PENDING` / `NOT_STARTED` | Hash is null until a signed attempt is persisted. Verification time and receipt remain null. |
| `SETTLED` | `ACCEPTED` / `CONFIRMED` / `NOT_STARTED` | Actual transaction hash, explorer URL and verification time exist; receipt remains null. |
| `PAYOUT_PENDING` or `PAYOUT_FAILED` | `ACCEPTED` / `CONFIRMED` / `PENDING` or `FAILED` | Keep the confirmed chain evidence and local payout reference. Receipt remains null; a payout failure does not undo settlement. |
| `COMPLETED_SIMULATED` | `ACCEPTED` / `CONFIRMED` / `PAID` | Actual confirmed chain evidence, local payout reference and the demo receipt all exist. `nextAction` is `NONE`. |

For `SETTLEMENT_FAILED`, preserve the known failed transaction hash but leave `verifiedAt` null and payout `NOT_STARTED`. In `REVIEW_REQUIRED`, retain the last known evidence; a payout review must not erase previously verified chain settlement. The public status version reflects the stored record, not a hard-coded number from an example.

The `amounts` and recipient snapshot are immutable. `version` increases whenever the public snapshot changes. Events have monotonic, unique per-transfer `sequence` values. A client must discard an older-version snapshot received after a newer one.

Use `lastIssue: null` or `{ "code": "RPC_TIMEOUT", "message": "Settlement outcome is not confirmed yet.", "retryable": true }`. `retryable` refers to reconciling/repeating the safe action; it never authorizes a fresh payment or nonce. `receipt` stays null until completion and then contains `{ "id": <opaque ID>, "issuedAt": <UTC timestamp>, "summary": "Demo completed: testnet settlement confirmed; THB payout simulated." }`. Amounts, FX, evidence and references remain in the surrounding snapshot rather than being duplicated in the receipt object.

## 7. Mutation responses and progress protocol

All three endpoints below return the shared snapshot with the standard metadata. `{}` means an empty JSON object, not client-supplied state.

| Endpoint | Request | Success response and effect |
| --- | --- | --- |
| `POST /api/demo/transfers/{id}/funding` | `{}` and `Idempotency-Key` | `200 OK`; `FUNDING_PENDING` becomes `FUNDED_SIMULATED` or `FUNDING_FAILED` according to the saved scenario. Persist the local funding result and event. |
| `POST /api/demo/transfers/{id}/advance` | `{}` | `202 Accepted` when work is pending; `200 OK` if terminal, held or no further work is available. Perform one bounded settlement/reconciliation/payout step. Every repeat must be safe through database guards and persisted attempts. |
| `POST /api/demo/transfers/{id}/payout-retry` | `{}` and `Idempotency-Key` | `202 Accepted`; only a known `PAYOUT_FAILED` can become `PAYOUT_PENDING`. Create one new mock payout attempt for a deliberate retry; never rerun the confirmed chain settlement. The retry fixture succeeds. |

Funding and payout-retry keys follow the same replay/conflict rule as transfer creation. A funding request arriving under a new key after funding already occurred returns `409 INVALID_STATE`; the original same-key replay returns its stored result/current snapshot. Payout-retry key reservation and creation of the new attempt must be atomic; a repeated original retry request must not create another attempt even after its state has advanced.

Suggested browser sequence: create session; load recipient; create/review quote; create transfer; simulate funding; then poll status and call `advance` only while `nextAction` is `ADVANCE`. Use approximately two seconds between calls, back off on errors, and allow only one client-side advance request in flight. Server-side guards are still mandatory because multiple tabs can exist.

`advance` must return before the hosting timeout. Do not use an unawaited promise, infinite loop or in-memory timer after sending the HTTP response. Initial baseline: one unresolved chain attempt per signer. Persist a database claim with a fencing/version check and nonce reservation so a stale or concurrent processor cannot produce a different signed transaction for the same logical work. Persist signed bytes, nonce and locally computed hash before broadcast; retry/rebroadcast those same bytes only after reconciliation. A database timeout, lost RPC response or expired lease is not permission for a fresh payment.

When the browser closes, already-broadcast blockchain execution can continue, but subsequent app-side reconciliation and mock payout may wait. On return, the UI reads saved state and resumes bounded `advance` calls. **Autonomous completion without any browser/client is not promised by this baseline.** If it becomes a requirement, add an explicitly hosted worker or durable runner and retain this API shape.

## 8. States and allowed next actions

| Transfer status | Meaning | `nextAction` |
| --- | --- | --- |
| `FUNDING_PENDING` | Awaiting local funding simulation | `SIMULATE_FUNDING` |
| `FUNDED_SIMULATED` | Simulated USD accepted; no real collection | `ADVANCE` |
| `FUNDING_FAILED` | Local funding declined; no chain payment | `NONE` |
| `SETTLEMENT_PENDING` | Preparing/broadcast/reconciling; outcome may be unknown | `ADVANCE` |
| `SETTLED` | Actual expected Fuji token transfer verified | `ADVANCE` |
| `SETTLEMENT_FAILED` | Known reverted transaction; evidence retained | `NONE` |
| `PAYOUT_PENDING` | Local mock payout is pending | `ADVANCE` |
| `PAYOUT_FAILED` | Mock payout definitely failed after settlement | `RETRY_PAYOUT` |
| `REVIEW_REQUIRED` | Unresolved or contradictory outcome; hold movement | `NONE` |
| `COMPLETED_SIMULATED` | Testnet settlement verified and local mock payout completed | `NONE` |

Normal path: `FUNDING_PENDING`, `FUNDED_SIMULATED`, `SETTLEMENT_PENDING`, `SETTLED`, `PAYOUT_PENDING`, `COMPLETED_SIMULATED`. The `FUNDING_DECLINED` scenario stops at `FUNDING_FAILED`; `PAYOUT_FAILED` reaches that state after verified settlement, and an explicit payout retry can complete it without a second token transfer.

Settlement substatus values: `NOT_STARTED`, `PREPARING`, `BROADCAST`, `PENDING`, `CONFIRMED`, `FAILED`, `REVIEW_REQUIRED`. Funding substatus values: `PENDING`, `ACCEPTED`, `DECLINED`. Payout substatus values: `NOT_STARTED`, `PENDING`, `PAID`, `FAILED`, `UNKNOWN`. Substatuses are interpreted with their `mode`, so `PAID` under `SIMULATED` never means bank credit.

Do not map insufficient test gas, RPC outage or missing receipt to a transaction revert. Preserve pending state and `lastIssue`, or hold `REVIEW_REQUIRED` if reconciliation cannot safely proceed. No generic force-success, force-refund or settlement-retry endpoint is included.

Persist each transition with its event and required next-operation intent atomically. Settlement verification checks network, receipt success, token contract, Transfer sender/destination and exact base-unit amount. Fix and test the confirmation policy in the implementation spec. A mock payout attempt has a stable request ID; unknown outcomes are queried under that same ID, whereas an intentionally retried known failure gets a new attempt. An event history is not a production financial ledger.

## 9. Error contract

Example `409 Conflict`:

```json
{
  "error": {
    "code": "IDEMPOTENCY_CONFLICT",
    "message": "This request key was already used with different input.",
    "retryable": false,
    "fieldErrors": {}
  },
  "meta": { "requestId": "req_error_001", "apiVersion": "v1" }
}
```

| HTTP | Codes | Client behavior |
| --- | --- | --- |
| 400 | `INVALID_INPUT`, `IDEMPOTENCY_KEY_REQUIRED` | Show field errors; do not fund or sign. |
| 401 | `UNAUTHENTICATED` | Establish a new demo session; do not expose old-session records. |
| 403 | `ORIGIN_NOT_ALLOWED`, `DEMO_DISABLED` | Stop the mutation; do not retry around the access rule. |
| 404 | `NOT_FOUND` | Generic missing/inaccessible record message. |
| 409 | `IDEMPOTENCY_CONFLICT`, `QUOTE_ALREADY_ACCEPTED`, `INVALID_STATE` | Read current state and resolve the conflict; do not create another payment blindly. |
| 410 | `QUOTE_EXPIRED` | Create and review a new quote; never silently substitute it. |
| 422 | `UNSUPPORTED_CORRIDOR` | Show that only the selected US-to-Thailand fixture is supported. |
| 429 | `RATE_LIMITED`, `DEMO_BUDGET_EXCEEDED` | Back off; respect `Retry-After` where supplied. |
| 503 | `DEPENDENCY_UNAVAILABLE` | Preserve the transfer; read/reconcile before repeating a mutation whose response was lost. |
| 500 | `INTERNAL_ERROR` | Display request ID; no stack traces, secrets or fabricated payment result. |

For validation, `fieldErrors` maps request-field names to readable strings. For other errors it is empty. An HTTP error does not establish that a side effect failed: if a mutation response is lost, read/replay the original operation/key before making any new intent. Async chain failure is a transfer status returned by a successful status read, not necessarily an HTTP 500.

## 10. Team ownership and review checklist

Backend owner implements the envelope, session/ownership rules, schema/uniqueness, money math, transitions and simulator modules. Frontend owner consumes the same snapshots and keeps idempotency keys stable across a retried logical action. Blockchain owner implements persisted signing and receipt verification behind a server-only module. QA/presentation owner tests arithmetic, two-session isolation, replay/conflict behavior, expiry, refresh/resume, known failure and unknown outcome.

Before implementation, agree: this contract version, cookie/session behavior, database constraints and transaction boundary, signer serialization/recovery, confirmation policy, deadline and who owns each shared file. This is a reviewable API design; it does not mean the application, tests or public deployment already exist.
