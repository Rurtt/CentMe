# Team Build Plan, Validation and Demo Runbook

Version 1.0 · Proposed work only; no owners or dates assigned

## 1. First decisions before scheduling

Confirm the deadline, actual team members/experience, public-hosting requirement, whether the demo needs both directions, and any prize requirement for a custom contract or Avalanche L1. The current baseline is one US→Thailand journey using Fuji, not a new chain.

Do not adopt the old “24 hours, four people” brief as a current commitment. Use the dependencies below to create a realistic schedule once the owner confirms resources. A documentation request is not an instruction to start deployment, buy services or contact partners.

## 2. Suggested workstreams

| Workstream | Suggested responsibility | Reviewable output |
| --- | --- | --- |
| Product/UI | Recipient, quote, tracking and receipt screens; honest simulation labels | Screen flow with success and failure states |
| Backend/data | Auth, owner-scoped API, money math, schema, jobs and event history | Migrations, fixture data and documented API |
| Blockchain/reliability | Fuji configuration, signer safety, persisted attempts and reconciliation | Actual testnet receipt and recovery evidence |
| Research/demo/QA | Sponsor rules, claim checks, scenario testing and presentation | Acceptance evidence, demo script and unresolved-risk list |

One person may cover several streams. These are not assignments. No teammate or AI agent has been contacted. If parallel work is later requested, give each task a bounded module and shared API/schema contracts; avoid two owners making conflicting edits to settlement state transitions.

## 3. Dependency-ordered implementation backlog

| ID | Task | Depends on | Completion evidence |
| --- | --- | --- | --- |
| T01 | Confirm event and MVP scope decisions | Owner input | Updated decision register with confirmed/proposed labels |
| T02 | Create app repository and version-compatible TypeScript setup | T01 | Clean install, build, lint/typecheck commands documented |
| T03 | Create database schema, constraints and fictional fixtures | T02 | Migrations/seed run from an empty database |
| T04 | Implement auth and owner-scoped recipient access | T03 | Two-account access checks pass |
| T05 | Implement exact money math, quote creation and expiry | T03 | Expected values and rounding verified by meaningful tests |
| T06 | Implement transfer creation and request idempotency | T04, T05 | Concurrent/repeated submissions create one transfer |
| T07 | Implement controlled funding/KYC mocks and durable jobs | T06 | Success/rejection/review paths persist visibly |
| T08 | Prepare Fuji test wallets and chain adapter | T02 | Correct chain/token metadata and balances observed |
| T09 | Implement persisted signing, signer serialization and receipt checks | T03, T08 | Actual transaction plus crash/timeout recovery evidence |
| T10 | Connect funding → settlement → mock payout | T07, T09 | Full journey; no payout on unverified settlement |
| T11 | Implement UI quote, tracking and receipt against API | T04–T06; tracking completes with T10 | Actual end-to-end browser walkthrough |
| T12 | Add failure scenarios and reconciliation/operator views | T10, T11 | Known failure vs unknown outcome shown correctly |
| T13 | Validate security boundaries and money invariants | T06, T09, T12 | Checks in section 5 pass |
| T14 | Prepare and rehearse demo, record evidence | T13 | Success, recovery and offline-backup presentation ready |
| T15 | Consider custom contract only if justified | Stable baseline or mandatory rules | Explicit scope decision, contract tests and Fuji deployment evidence |

Create the smallest functioning vertical slice early: seeded recipient → quote → confirmed mock funding → actual token transfer → verified receipt → simulated payout. UI polish and optional contract work should not postpone discovery of chain/key/worker integration problems.

## 4. Proposed milestones

**M1: agreed design.** Owner/team understands the actual-versus-simulated boundary and one-direction scope. Event requirements are recorded rather than guessed.

**M2: local financial flow.** Auth, fixtures, exact quote math, idempotency and mock funding work with durable records. No chain success is fabricated.

**M3: actual Fuji settlement.** Test USDC moves between the selected wallets; receipt verification is tied to the correct application transfer. Work continues when the browser closes.

**M4: recovery and payout.** Uncertain outcomes do not create duplicate transfers; simulated payout begins only after settlement and retries independently.

**M5: presentation ready.** Screens are understandable, public claims match evidence, scripts work on the presentation machine and backup material is honestly labeled.

No duration estimates are assigned because deadline, capacity and familiarity are open.

## 5. Acceptance and test matrix

These are required behaviors to validate during implementation, not tests already written or passed. Focus on financial and authorization invariants rather than snapshots that mirror implementation details.

| ID | Scenario | Expected outcome |
| --- | --- | --- |
| A01 | Valid USD input with fixture rate/fee | Exact integer amounts and net THB match specified rounding |
| A02 | Invalid amount, unsupported currency or excess precision | Rejected before a transfer/job is created |
| A03 | Quote expires before confirmation | Rejected without funding or settlement |
| A04 | Quote accepted before expiry, chain later delayed | Accepted amounts stay unchanged |
| A05 | User submits another account's recipient/quote/transfer | Denied without exposing that account's records |
| A06 | Same key and same request repeated concurrently | One transfer and one logical funding operation |
| A07 | Same key reused with different payload | Conflict; no second payment |
| A08 | Same quote submitted under another key | No second transfer |
| A09 | Funding mock rejects or KYC mock reviews | No settlement job becomes executable |
| A10 | Wrong RPC chain or token metadata | Startup/job blocked with a clear reason |
| A11 | Insufficient test AVAX/USDC | Blocked before unsafe submission; no simulated payout |
| A12 | Broadcast accepted, response lost | Stored hash is reconciled; no new-nonce duplicate |
| A13 | Worker restarts after signing/broadcast | Resumes from persisted attempt |
| A14 | Two workers claim/process the same logical work | Constraints/claiming/signer policy prevent duplicate settlement |
| A15 | Successful receipt with wrong token/from/to/amount | No SETTLED state or payout |
| A16 | Known reverted settlement | Failure receipt retained; payout held |
| A17 | Receipt succeeds but DB update fails | Recovery records that transaction once and enqueues one payout job |
| A18 | Payout mock definitely fails after settlement | Retry affects only payout, not token transfer |
| A19 | Payout result is unknown | Query same request ID; do not blindly issue another payout |
| A20 | Browser closes during processing | Worker continues; tracking works on return |
| A21 | Client tries to override fee, token destination or net amount | Server-owned accepted quote/config governs execution |
| A22 | Unauthenticated user calls demo controls | Denied; no state mutation |
| A23 | Logs, client bundle and API responses inspected | No signing key, service-role secret, raw signed transaction or real personal data exposed |
| A24 | Successful demo displayed | Actual Fuji hash plus explicitly simulated funding/payout references |

Use local fixtures/fakes for deterministic failure tests and at least one actual Fuji transfer for integration evidence. A mocked transaction hash does not demonstrate settlement. Keep live integration tests bounded to conserve test gas and avoid faucet dependence during automated runs.

## 6. Evidence to retain

- Exact source revision and installed dependency versions.
- Commands used for build/typecheck/test plus actual outputs and dates.
- Testnet chain ID, token address, public service wallet addresses and transaction hash.
- Receipt status and verified Transfer event fields matching the stored intent.
- App transfer ID and non-sensitive event history showing separate settlement/payout steps.
- Recovery evidence: interrupted worker or simulated lost broadcast response, with no duplicate payment.
- Short video or screenshots showing simulation labels.

Do not include private keys, database credentials, real identity documents or bank details in a submission/evidence bundle. A public wallet address and transaction hash are not credentials, but they still should be intentionally shared.

## 7. Setup/runbook to write once code exists

The application does not exist yet. The implementer must replace this checklist with exact tested commands; do not tell teammates to run package scripts that have not been created.

1. Document repository URL, branch and required Node/package-manager versions.
2. Install from the committed lockfile.
3. Create a demo Supabase project or supported local equivalent, then run migrations and seed synthetic accounts/recipients.
4. Configure server-only credentials and test-wallet key through the chosen secrets mechanism.
5. Confirm Fuji chain/token configuration, service-wallet balances and destination allowlist.
6. Start the web process and continuously running worker; verify health and database access.
7. Run one small test transfer and confirm the complete stored event chain.
8. Run build/typecheck/tests and the browser smoke path on the presentation machine.
9. Record how to stop/restart the worker and reconcile pending attempts.
10. Record how to reset only mock/demo fixtures without deleting unresolved chain attempts.

Never erase unresolved attempts as a shortcut to reset the presentation. Resetting database state does not reverse an on-chain transfer.

## 8. Demo script

Suggested narrative, adaptable to the event's actual presentation time:

1. **Problem:** A person wants to pay someone abroad without dealing with crypto. Explain that total cost and clear delivery status matter.
2. **Scope:** State that this is a US→Thailand prototype, with simulated banking and actual Avalanche testnet settlement.
3. **Quote:** Select a fictional Thai recipient and enter a small amount. Show total USD debit, explicit fee, fixture rate and net THB before confirmation.
4. **Funding:** Confirm simulated collection. The UI moves to settlement processing.
5. **Blockchain proof:** Open the actual transaction in the Fuji explorer. Explain the service paid test AVAX gas and transferred test USDC behind the interface.
6. **Payout:** Return to the app and show simulated THB payout as its own milestone, not something the explorer proves.
7. **Reliability:** Show a prepared failure/recovery scenario, preferably payout failure after settlement or RPC uncertainty without duplicate payment.
8. **Commercial honesty:** Explain that production requires approved partners and matched cost quotes. The settlement cost hypothesis is still being measured.

Do not display invented bank confirmations. A recording is acceptable backup evidence of a prior real testnet run when labeled with its date/transfer reference; do not pass it off as a live transaction.

## 9. Presentation preparation checklist

- Test wallets have enough test USDC and test AVAX for rehearsals and retries.
- Faucets are used before the event; their availability is not on the critical demo path.
- Fixed recipient fixtures and selected quote inputs are ready.
- App, worker, database and explorer work on the presentation network.
- Any backup RPC is configured for the same chain; contradictory results hold payout.
- Operator scenario controls are restricted and have understandable labels.
- Prior unresolved transactions are reconciled; wallet nonce history is understood.
- The team can explain why blockchain is used and what it cannot prove.
- A short recording, screenshots and technical references are available if internet fails.
- Presentation claims match section 11 of [RESEARCH-AND-LEGAL.md](RESEARCH-AND-LEGAL.md).

## 10. Production go/no-go gates

These are outside hackathon implementation. Do not describe them as completed.

| Gate | Required result |
| --- | --- |
| Use-case and corridor | Written approval for the exact general-P2P purpose, origin/destination and customer eligibility |
| Legal roles | Documented principal/agent/software roles and applicable permissions in both countries and relevant US states |
| Contracts | Executed product-specific agreements, pricing, reserve schedules, liabilities and data terms |
| Asset/network compatibility | Explicit partner support for native USDC on Avalanche in the approved program |
| Economics | Matched quotes plus platform cost, capital, reserve and loss assumptions |
| Customer-funds design | Ledger, safeguarding/custody, treasury, reconciliation, refunds and insolvency treatment |
| Controls | Appropriate KYC/AML/sanctions, security, key management, operational monitoring and support |
| Consumer obligations | Approved disclosures, receipts, cancellation, errors, complaints and marketing |
| Pilot approval | Bounded pilot plan with accountable entities and written go-ahead |

## 11. Suggested skills for future AI work

Use equivalent capabilities if these skill names are unavailable; availability is environment-specific. Read the actual skill and repository instructions before relying on them. The list is a suggestion, not an instruction to install tools or override the owner.

- **handoff:** update context after milestones and keep facts/approvals separate from proposals.
- **brainstorming / writing-plans:** resolve remaining architectural scope and turn it into a reviewed implementation plan.
- **frontend-design or impeccable:** build or review the quote/tracking interface once implementation is requested.
- **test-driven-development / tdd:** useful for money math, state transitions, idempotency and recovery logic.
- **systematic-debugging / diagnose:** reproduce an actual failure before changing settlement behavior.
- **verification-before-completion:** run the real checks before claiming the app is complete or a transfer works.
- **documents or pdf:** only if producing/editing those formats, including their render-and-inspect requirements.

Do not introduce AI features merely because AI agents are helping development. The product's AI scope remains deferred.
