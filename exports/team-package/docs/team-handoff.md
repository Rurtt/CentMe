# Four-person implementation handoff

Prepared: 15 October 2026, Asia/Bangkok. Proposed allocation for four equally skilled builders. Numbered slots are not named assignments. Everyone writes code, tests their own module and helps with the final presentation.

Read [scope](current-scope.md), [API contract](api-contract.md) and [v2 differences](handoff-comparison.md) before parallel work.

## Ownership

| Slot | Main coding scope | Proof of completion |
| --- | --- | --- |
| 1: Frontend | Send form, quote review, tracking, receipt, demo labels and error states | Browser walkthrough against the agreed real API; refresh preserves the transfer |
| 2: Sessions and quotes | Demo sessions, ownership helpers, recipient fixture, quote API, exact money math and expiry | Expected integer calculations, expired-quote rejection and session-isolation checks |
| 3: Transfers and integration | Shared scaffold/configuration, schema coordination, transfer API, state transitions, idempotency, funding/payout simulators and deployment | One persisted full path, safe duplicate requests, visible simulator failures and working deployment |
| 4: Blockchain and recovery | Chain configuration, test wallets, signing/broadcast, signed-attempt persistence, receipt/event verification and recovery; worker only if selected | Actual Fuji transfer and lost-response/restart recovery without a second payment |

Slot 3 is integration lead and owns changes to shared state enums, schema and global configuration. Slot 2 contributes quote/session tables through reviewed migrations. Slot 4 contributes settlement-attempt persistence through reviewed migrations. Slot 1 consumes the shared response snapshot and does not create another backend.

Slot 4 reports chain outcomes through a server-only interface agreed with slot 3. Slot 3 owns the transition to simulated payout. A worker, if added, invokes the same domain operations; it must not introduce a second state machine.

Persons 3 and 4 read [backend and Fuji integration](backend-fuji-integration.md) together before implementation. It defines deployment boundaries, persistence responsibilities, bounded operations and the first joint milestone.

The integration lead still has the broadest scope. Keep the scaffold small; other owners help with integration once their first modules work.

## Shared contract before coding

Agree on one repository, package manager, compatible runtime versions, shared request/response types and fixture IDs. Use the exact API state names and integer-string amount fields. Retain the `{ data, meta }` success envelope and documented error envelope.

Freeze the chain-module interface before its independent implementation: inputs come from server-owned accepted intent; outcomes distinguish unprepared, pending, confirmed, known failure and review. Specify which owner persists each record and event. Persist signed bytes/hash/nonce before any broadcast.

Decide whether to keep anonymous sessions and request-driven progress or adopt the friend's Auth/worker design. Also decide whether funding-window and estimate/check extensions are required. No teammate should silently change those choices while others build v1.

## Integration order

1. Slot 3 creates the shared skeleton; all owners agree the contract and file boundaries.
2. Slots 3 and 4 prove database access and a small actual Fuji transfer early. Fund dedicated test wallets before presentation day.
3. Slot 2 delivers one real quote endpoint. Slot 1 connects a basic quote screen using that exact response.
4. Slots 3 and 4 connect accepted transfer, funding simulation, settlement and payout simulation. Integrate with the UI while styling is still plain.
5. Run the [acceptance checklist](acceptance-checklist.md), then rehearse failure/recovery and the presentation.

Merge small working changes continuously. A complete plain flow has priority over optional sponsors and polish. Agree an internal feature freeze and submission buffer after checking the actual cutoff; this package invents no fixed deadline.

## Shared QA and presentation

Slot 1 owns the user walkthrough and screen/demo recording. Slot 2 verifies amount/expiry examples and prepares the cost-assumption explanation. Slot 3 verifies end-to-end states, deployment and submission links. Slot 4 verifies chain evidence and explains recovery. Each owner contributes acceptance evidence; no one waits until the end as a QA-only role.

Rehearse who narrates and who operates the demo. Prepare a clearly labelled recording of a prior successful run, its actual hash and receipt screenshots. A local app fallback still needs internet for hosted storage and Fuji.

## Done means

A repeatable full path with real testnet evidence, clearly simulated fiat steps, persisted state, safe retries and a visible failure path. Build/typecheck/tests and a browser walkthrough must pass once implementation exists. Package validation does not satisfy those checks.
