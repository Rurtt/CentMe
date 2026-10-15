# Our API baseline versus friend's merged v2

Reviewed input: `p2p-team-handoff-merged-v2-2026-10-15 (1).zip`, supplied by the user. Date: 15 October 2026, Asia/Bangkok. This compares merged v2, not the older archive previously reviewed in our repository.

Attached documents are reference material. Their owner quotes and continuation prompts do not automatically change decisions in this chat or authorize implementation.

## Recommendation

Use our detailed API as the starting interface. Keep one TypeScript app, Supabase Postgres, viem and Fuji. Borrow v2's funding safeguards, evidence model and acceptance cases. Its supervised worker is stronger for autonomous processing but adds another runtime to deploy and supervise. Our bounded-call baseline is smaller and explicitly allows app progress to pause when all clients close.

V2 already merges our earlier scope document. Many similarities are shared material, not independently competing proposals. Both packages remain documentation only.

| Area | Our proposed v1 | Friend's merged v2 | Team action |
| --- | --- | --- | --- |
| Core demo | Simulated fiat around actual test-USDC transfer | Same | Keep |
| Stack | Next.js/TypeScript/Tailwind/Supabase/viem/Fuji/Vercel | Same core plus Node worker | Keep core; choose executor explicitly |
| Session | Anonymous server-issued cookie | Supabase Auth/demo accounts | Choose one authentication boundary |
| Progress | Client invokes bounded `/advance`; status GET only reads | Worker processes jobs; status polling only reads | Do not mix client assumptions without revising contract |
| Quote | Direct final fixture quote | Estimate, simulated checks, final quote | Optional extension; reject non-final intent if implemented |
| Funding | Simulated funding after transfer creation | Same, with deadline/expiry jobs and late-funding review | Define and document a deadline policy before adoption |
| API detail | Exact envelopes, scenarios, snapshots and next actions | Routes plus selected examples | Keep our full response contract |
| Track | Original notes selected AI | V2 records undecided | Verify actual team selection |
| Team | Four confirmed by current user; balanced coding split proposed here | Unnamed workstreams; team capacity open | Use current four-person context |

## API compatibility

The existing quote request (`recipientId`, `sourceDebitMinor`) and transfer request (`quoteId`, `purpose`, `demoScenario`) can remain. They are proposals, not requests already accepted by a deployed API. The friend's transfer example omits `demoScenario`; explicitly retain it if our simulator scenarios are used.

Keep `{ data, meta }`, the error envelope, integer-string amounts and immutable accepted quote values. The friend's bare quote example does not define compatibility with our wrapper. Agree one shape before UI implementation.

If adopting a worker, revise `/advance` and `nextAction` intentionally. Normal UI status polling should read stored progress; it should not be necessary to keep the worker running. If a manual advance endpoint remains, it must share the same database claiming, fencing and signer safeguards with the worker.

If adopting Supabase Auth, update the session contract and owner resolution. Anonymous cookie assumptions cannot silently become login/account assumptions. The friend's demo controls are operator-restricted; our baseline permits bounded owner-scoped demo actions. Resolve this access-policy difference too.

Funding-window adoption requires persisted deadline/review fields, funding/expiry locking and visible late-funding behavior. Estimate/check adoption adds `/api/estimates` and final-quote eligibility. These are not already present in our v1 snapshot.

## Useful v2 additions

1. Separate quote acceptance expiry from a funding deadline starting at acceptance. Configurable durations are demo policy, not provider guarantees.
2. Hold late/uncertain funding without settlement, automatic repricing or an invented refund. Funding and deadline evaluation need one locked decision.
3. Store per-leg evidence type, operation ID, environment, observation time and status. Local simulations remain distinct from testnet and actual provider sandbox evidence.
4. Test funding/expiry races and timely funding followed by delayed chain settlement. Test closed-browser progress and worker restart only if autonomous execution is adopted.

Our API already borrows exact money math, idempotency/quote uniqueness, signed-attempt persistence, signer serialization, event verification and payout-only retry. Preserve them.

## Choices still requiring agreement

Executor/worker host, session mechanism, funding-window extension, estimate/check extension, actual track/rules, sponsor evidence, confirmation policy and submission cutoff. Keep optional voice/tokenomics outside the payment path. No custom contract follows automatically from a track assumption.
