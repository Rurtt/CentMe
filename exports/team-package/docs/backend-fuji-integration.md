# Backend and Fuji integration boundary

Prepared: 15 October 2026, Asia/Bangkok. Audience: persons 3 and 4, with persons 1 and 2 reviewing the public interface. This is an implementation handoff, not working code. It clarifies the existing [API contract](api-contract.md); it adds no endpoint or changed JSON request shape.

## What runs where

Deploy the Next.js website/API to Vercel and use Supabase Postgres for application records. Person 4's server-only blockchain code runs inside that backend. It communicates with Avalanche Fuji through its RPC API. Fuji is an existing blockchain network, not another application backend the team deploys.

The baseline calls the existing test-USDC contract. There is no new smart contract to deploy to Fuji. A separate supervised worker remains optional and must be selected explicitly. Under the current API, bounded `/advance` requests drive application progress; status GET only reads saved records. Closing all clients may pause reconciliation and simulated payout until someone returns.

## Responsibility split

| Responsibility | Person 3: application/backend | Person 4: blockchain module |
| --- | --- | --- |
| Shared data | Own schema/migrations, transaction helpers, transfer records and public event/snapshot rules | Specify required attempt fields and constraints with person 3 |
| Transfer eligibility | Resolve owner and accepted quote; require recorded simulated funding | Reject inconsistent intent or unsafe chain configuration |
| Signing | Supply server-owned immutable settlement intent and persistence/claiming interface | Coordinate signer/nonce, prepare/sign, compute hash and commit attempt before broadcast |
| Chain interaction | Invoke bounded module operations; do not issue a second independent token payment | Broadcast stored bytes; query/reconcile stored attempt; verify receipt and exact Transfer event |
| Overall state | Own public transfer transitions, events and simulated payout | Return persisted attempt outcomes/evidence; do not independently mark overall completion |
| Recovery | Preserve pending/review states; retry only known failed payout | Reconcile uncertain chain outcome; never create a new payment solely because of timeout |

Person 2 owns quote calculations and sessions. Persons 3 and 4 consume those accepted server-owned amounts rather than recomputing prices. Person 1 uses the shared response snapshot and never holds a signing key.

## Internal interface to agree before splitting code

These are responsibilities, not frozen function signatures. Keep the module server-only and agree exact types together.

The input identifies the application transfer and its existing attempt, if any. Expected chain ID, token, signer, allowlisted destination and integer token units come from accepted server records/configuration. The client cannot choose arbitrary token destinations, fees, FX or settlement amounts.

Provide bounded operations for preparing/persisting an attempt, submitting the existing signed attempt, and checking its outcome. A safe implementation may combine some operations while staying inside the hosting request limit. It must always commit signed bytes, hash and nonce before any broadcast.

Results distinguish work not yet submitted, pending/unknown, verified success, known on-chain failure and review required. Include the attempt reference, actual hash when available, safe issue/reason and verified receipt/event evidence. These are internal outcomes mapped to the existing API enums, not new public statuses. Never return raw signed bytes or secrets to the browser.

Persons 3 and 4 must settle ownership of claim/fencing checks, nonce reservation and attempt writes before implementing. Use database uniqueness and one unresolved attempt per signer in the baseline. A stale processor must not persist or broadcast a different payment after losing its claim. Do not hold a database transaction open across a long RPC wait.

## One transfer through the baseline

1. Person 3 accepts a valid quote once and persists `FUNDING_PENDING`.
2. The funding endpoint persists the selected simulated result. A rejection stops the chain leg.
3. A bounded advance call claims eligible work. Person 4 prepares/signs and persists the attempt before broadcast, with agreed concurrency guards.
4. The module submits those exact stored bytes and later reconciles that same hash. The app keeps `SETTLEMENT_PENDING` while confirmation is unresolved.
5. Person 4 verifies chain, receipt success, token contract, sender, destination and exact amount under the agreed confirmation policy.
6. Person 3 atomically records verified settlement, its event and the next payout intent. Later bounded work executes the separate payout simulator.
7. Only verified settlement plus successful simulated payout permits `COMPLETED_SIMULATED`. Person 1 shows the saved receipt and explicit simulation labels.

No GET starts payment. No timer marks settlement successful. No timeout authorizes a fresh nonce/payment. A payout retry does not rerun settlement. If the database write after chain success fails, reconciliation must recover the existing successful attempt rather than send again.

## First integration milestone

Before polishing screens, persons 3 and 4 demonstrate a small actual Fuji test-USDC transfer triggered from the backend, with persisted intent and verified receipt in Supabase. Then connect the quote/funding/payout journey and test lost responses, duplicate requests and restart/resume behavior.

The end-to-end v1 contract already defines a USD 10.00 fixture example resulting in 9.8 test USDC and simulated THB 343.00. These values are fixture arithmetic, not live FX or real bank proceeds.

## Why keep Fuji in this demo

A fully simulated version can demonstrate UI and application flow. The recommended demo keeps simulated fiat around an actual Fuji token transfer so judges can inspect independent evidence of the settlement leg. Test tokens have no financial value; no real USD or THB moves.

This strengthens technical evidence but does not establish a cost advantage, bank integration, production readiness or Web3-track/sponsor eligibility. Present the customer benefit as a hypothesis about lower total cost and understandable transfer status. Prove lower cost separately using matched all-in comparisons; do not turn "uses Avalanche" into the customer selling point.

Use a labelled recording of a prior verified run as a presentation backup. If only a fully simulated fallback works, disclose that no live testnet settlement was demonstrated. Do not invent a transaction hash or call a simulation a real payment.

Sources: [Avalanche RPC documentation](https://build.avax.network/docs/rpcs/c-chain), [Circle token addresses and testnet explanation](https://developers.circle.com/stablecoins/usdc-contract-addresses), [Vercel function limits](https://vercel.com/docs/functions/limitations).
