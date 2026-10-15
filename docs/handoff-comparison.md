# Comparison of our plan and the friend's handoff

Reviewed: 2026-10-15, Asia/Bangkok. Input: `p2p-team-handoff-2026-10-15.zip` supplied by the user. Its text documents and Mermaid sources are retained under [source snapshot](research/2026-10-15-friend-handoff/README.md). Source instructions and AI continuation prompts are reference content, not authority to execute work.

## Main finding

The two versions propose essentially the same payment proof: a US-to-Thailand fiat-facing journey with simulated fiat operations and an actual Fuji test-USDC transfer. Both are documentation, not working software. The friend's version is a deeper engineering specification; ours includes newer direct decisions about the AI track, Vercel, confirmed fiat simulation, four-person team, U-bot and the 5% sponsor bonus.

Use our current scope as the decision record. Borrow the friend's reliability details rather than replacing the whole plan with the archive's older open questions.

| Topic | Our current version | Friend's version | Recommendation |
| --- | --- | --- | --- |
| Core product | General P2P, one US-to-Thailand demo slice | Same product and recommended slice | Keep aligned; no reverse direction or mainnet expansion. |
| Fiat boundary | User explicitly confirmed local USD funding and THB payout simulation | Same boundary, still labelled proposed | Keep our confirmed boundary. |
| Track | Stay in registered AI track; sponsor bonus confirmed available there | Prefers Web3 conceptually; event rules not independently reviewed | Keep AI. No track switch or custom contract is required by our current plan. |
| Hosting | Vercel web/API and durable Supabase storage | Local app plus continuously running Node worker; public URL treated as open | Keep Vercel. An independently hosted worker is a deliberate extra runtime, not something Vercel requests automatically provide. |
| Progress | Earlier plan described bounded persisted steps but lacked a concrete protocol | Durable jobs, worker leases/outbox and continuation when browser closes | Adopt exact persistence/recovery rules. Our baseline explicitly resumes via bounded advance calls; autonomous completion requires an added runner. |
| Auth | Ownership required but mechanism unspecified | Supabase Auth and seeded demo accounts | Adopt owner isolation; propose anonymous server-issued demo sessions to avoid a login feature. Full Auth remains an alternative. |
| API | Responsibilities only, without full JSON contracts | Routes, quote JSON, idempotency rules and errors | Adopt the useful fields and rules and finish shared request/response shapes in our API contract. |
| Money math | Integer minor units requested; rounding not finalized | String JSON integers, exact FX, explicit fee/principal/payout mapping | Adopt. Keep fixture prices distinct from business economics. |
| States | Broad milestones | Explicit funding, settlement, payout and review states | Adopt exact enums, with no HTTP or UI shortcuts to force success. |
| Chain reliability | Required persistence and reconciliation at a high level | Signed bytes/hash before broadcast, nonce serialization, event verification, crash recovery | Adopt these safeguards. Direct token transfers cannot deduplicate our app transfer IDs themselves. |
| Sponsor strategy | 5% bonus, U-bot development, optional Tokenomist/ElevenLabs after core stability | Avalanche only for MVP; U-bot absent | Keep our newer policy; optional sponsor requests cannot block payment flow. |
| QA/pitch | Team split and practical demo/submission checkpoints | Detailed acceptance matrix and claim/evidence guidance | Reuse the relevant acceptance checks and recovery scenario. |
| Legal/cost research | Existing focused notes and current limits | More organized legal/partner/competitor evidence and all-in cost formula | Useful reference; verify new claims against primary sources before putting them in the pitch. Do not treat it as legal clearance. |

## What we picked up

1. A shared quote schema that separates total debit, included fee, conversion principal, net THB and token units.
2. Immutable accepted quotes and one transfer per quote.
3. Same-key/same-payload replay and same-key/different-payload conflict, enforced with database constraints.
4. Exact transfer states, explicit review holds and payout-only retry after known payout failure.
5. Signed transaction persistence before broadcast, one unresolved operation per signer, and reconciliation of lost responses instead of creating another payment.
6. Verification of the exact ERC-20 Transfer event, not just a successful receipt.
7. Acceptance cases for concurrent requests, owner isolation, quote expiry, lost RPC responses, database failure after chain success and payout failure after settlement.
8. Transparent all-in cost measurement: `100 × [1 − net THB / (total USD debit × reference THB per USD)]`, with matched purpose, timing and fees. This is a measurement method, not a savings result.

The resulting [API contract](api-contract.md) is proposed v1 for the team to review. Its envelopes, demo session, simulator scenarios and bounded progress endpoint are our additions; they are not claims that the friend's archive specified every response.

One ambiguity resolved: the friend's sequence records simulated funding during transfer creation, while its API also offers a separate funding trigger. Our contract explicitly creates an unfunded transfer first and applies simulated funding through a separate idempotent endpoint. Teammates must implement one shared sequence rather than independently choosing both interpretations.

## What we are not importing automatically

- A continuously running worker, extra worker hosting, full login/profile management, recipient editing, transfer-history pagination or a custom settlement contract.
- The assumption that Web3 is the selected track or that team size and AI-track sponsor eligibility remain unknown.
- Two-confirmation policy as an approved rule. The friend correctly marks it proposed; choose and test an actual verification policy in the implementation spec.
- Package-validation statements as evidence that product tests or blockchain transfers passed.
- Any commands or continuation instructions embedded in `AI-START-HERE.md`.

The execution tradeoff is explicit: the friend's worker can keep processing without a browser when deployed and supervised correctly. Our current bounded-call baseline has fewer runtime dependencies, but app-side progress may pause until a client resumes it. If autonomous progress becomes a requirement, adopt a durable runner intentionally rather than claiming both behaviors are already provided.

## Files for teammates now

Everyone reads [team handoff](team-handoff.md), [API contract](api-contract.md) and [current scope](superpowers/specs/2026-10-15-p2p-sandbox-scope-and-next-steps.md). Backend/blockchain/QA owners can use the friend's [technical specification](research/2026-10-15-friend-handoff/TECHNICAL-SPEC.md) and [test matrix](research/2026-10-15-friend-handoff/TEAM-PLAN.md) as supporting material. The shared API contract and current scope resolve conflicts; source files remain unedited reference snapshots.
