# Team handoff for the cross-border payment demo

Updated: 2026-10-15, Asia/Bangkok. Team size: four. This is a proposed work split and coordination checklist for team review, not code already implemented or a replacement for the detailed implementation specification.

## Shared outcome

Deliver one reliable sender journey: enter a USD amount and synthetic Thai recipient, review an illustrative quote, simulate USD funding, execute a test-USDC transfer on Avalanche Fuji, simulate THB bank payout, and show a saved receipt with accurate evidence labels.

The application and testnet leg must work. Fiat funding, conversion, verification and bank payout are local simulations. The business, production permissions, prices and demand remain unvalidated. Stay in AI track. No in-product AI feature is required.

Stack: Next.js App Router, React, TypeScript, Tailwind CSS, Next.js Route Handlers with Node.js runtime, Supabase Postgres, viem, Avalanche Fuji test USDC and Vercel hosting. No separate backend service, custom token or custom smart contract is planned.

## Files to share

Everyone reads this file first, then [API contract](api-contract.md) and [current scope and decisions](superpowers/specs/2026-10-15-p2p-sandbox-scope-and-next-steps.md). The contract now specifies proposed v1 routes, exact JSON responses, integer-string money fields, state enums, ownership and idempotency. Review it together before implementation. The current scope takes precedence over historical idea briefs; [handoff comparison](handoff-comparison.md) records what we adopted from the friend's package.

The presentation/research owner also reads [cost evidence](cost-check.md) and [payment-rail research](payment-rails-feasibility-2026-10-15.md). These contain earlier provider proposals and research limits; use the current scope for what the team will build.

Share the Git repository with all builders. When implementation creates configuration files, share a placeholder `.env.example`; distribute actual secrets privately to the teammate responsible for the relevant service, not inside the handoff or repository.

## Four workstreams

Assign people by strengths. Every workstream has one owner, and one named integration owner has final responsibility for the shared application. The following is a recommended allocation, not an assignment to specific teammates.

| Owner | Scope | Deliverable and proof |
| --- | --- | --- |
| 1 Backend and integration | Initial shared app scaffold, API contract, database/schema, transfer states, local fiat simulators, deployment and integration. | A persisted transfer survives refresh; repeated events cannot create duplicate operations; Vercel runs the shared app. This owner coordinates merges and the final release. |
| 2 Frontend and UX | Amount/recipient form, quote review, progress, receipt, test-mode labels and error/recovery presentation. | Entire journey works against the agreed API, including failed funding and failed payout, without wallet connection. Owns UI files; does not create a second backend or app. |
| 3 Blockchain | Dedicated test wallets, test AVAX/test USDC access, chain module, transaction preparation/broadcast, receipt/event verification and uncertain-outcome recovery. | One real Fuji token transfer with independently verifiable receipt; duplicate requests cannot trigger another settlement. Exposes a server-side module to owner 1 rather than a separate service. |
| 4 QA and presentation | Demo script, first user walkthrough, test scenarios, cost assumptions, architecture explanation, legal/partner boundaries, submission checklist, sponsor evidence and backup recording. | Reproducible test results, concise deck, labelled backup demo and complete submission. Starts fixtures and walkthrough tests immediately rather than waiting for coding to finish. |

Owner 1's scope is the bottleneck. If another owner finishes early, help with integration and verification before adding sponsor features.

## Agree before parallel implementation

Spend a short team sync agreeing the following and record the final choices in the implementation specification:

1. The exact submission cutoff and upload requirements from the official event portal; schedule internal checkpoints earlier.
2. One repository, one Next.js application, package manager, shared branch policy and file ownership. One person owns global configuration and schema changes.
3. Request/response types, state names and synthetic recipient fixtures. UI and backend must use the same contract.
4. Amount representation: all JSON amounts use integer strings, including USD cents, THB satang and test-USDC base units. Use the versioned fixture arithmetic and expiry in the API contract.
5. Allowed simulator outcomes and who can trigger them. Keep simulator controls scoped to demo transfers; no arbitrary onchain destination or unrestricted public signing endpoint.
6. Chain-module interface, transaction persistence before broadcast, signer nonce coordination and the rule for reconciling unknown outcomes before retrying.

The [API contract](api-contract.md) supplies the routes and complete shared response shape for these responsibilities:

| Interface | Purpose |
| --- | --- |
| Create quote | Return quote ID, total USD spend, fees, expected THB, expiry and explicit assumption labels. |
| Create transfer | Validate the quote and recipient fixture; persist the transfer with an idempotency key. |
| Simulate fiat event | Apply an allowed funding/payout event to an existing transfer; enforce state transitions and duplicate protection. |
| Advance settlement | Run one bounded server-side settlement step; reconcile an existing transaction before considering any new broadcast. |
| Read transfer | Return saved status, amounts, events, transaction hash and receipt evidence; reading status must not trigger a fresh payment. |

Use the exact status enums from the API contract rather than inventing separate frontend/backend names. Keep an unknown transaction outcome pending with an explanation until reconciled. Payout cannot proceed before confirmed settlement. The bounded-call baseline resumes after a refresh; autonomous app-side completion after all clients close requires an additional durable runner and is not currently promised.

## Integration checkpoints

- First, owners 1 and 3 verify database access and one Fuji transfer. Identify access blockers before polishing UI.
- Then deploy the shared skeleton and connect one UI screen to a real backend/database operation. Use fixture responses temporarily only under the agreed contract.
- Integrate the entire happy path early, even with plain styling. Merge small working changes during development rather than combining four isolated deliverables at the end.
- Target a working end-to-end deployment at least three hours before submission. These are recommended relative checkpoints, not a newly confirmed event deadline.
- Freeze new features two hours before submission. Fix blockers, rehearse and check deployment/configuration. Submit the required artifacts about an hour before the official cutoff where possible; do not wait for perfect polish.

## Definition of ready for judging

- A fresh demo transfer completes with an actual testnet receipt and clearly simulated THB payout.
- Refresh preserves state. Repeated confirmation or duplicate events do not duplicate settlement/payout.
- Funding failure stops the chain leg. A chain timeout stays pending/unknown. Payout failure never displays completed.
- Quote expiry and rounding behave as specified. Displayed amounts reconcile.
- The public deployment works from an incognito browser and another device. Receipt/status access does not expose other sessions' synthetic transfers.
- Test-wallet balances cover several rehearsals, with the correct chain, token contract and gas asset checked.
- Simulator signing and secret-bearing operations stay server-side. Backend permits only bounded demo amounts and dedicated test destinations.
- Every presentation claim matches its evidence. Savings use a transparent scenario model; there is no claim of real bank delivery or legal clearance.
- The team has rehearsed the official presentation length and knows which person narrates, operates the demo and answers technical questions.
- Repo, demo URL, deck and write-up are submitted as required; repo access and links are checked from outside the owner's signed-in session.

## Backups and sponsor policy

No plan is fail-proof. Prepare a recording of a verified complete run, its transaction hash and screenshots of the receipt. Label recordings/replays honestly. Rehearse a local application build as a hosting fallback; it can still depend on the database and RPC, so it is not automatically an offline backup. Do not replace a failed live transfer with an invented explorer result.

Keep the latest tested deployment available for rollback. Save backup assets locally with the presenter. Prepare one alternate network connection if practical.

Sponsor bonus is reported as 5% and available in AI track. Avalanche is core. Use U-bot during development if convenient and retain evidence. Development-only eligibility can be checked with organizers tomorrow. Tokenomist/ElevenLabs are optional additions only after the main demo passes; their requests must not block the transfer path. Do not spend tonight waiting for organizer replies.

## Three reminders

- Hackathon master: Get one complete demo working early, then spend the remaining time making it repeatable and easy to present.
- Judge: Show the exact user benefit and evidence, and state clearly which parts work, which are simulated and which remain hypotheses.
- Lead engineer: Agree the interfaces before splitting work, assign one integration owner and merge continuously.
