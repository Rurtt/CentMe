# Acceptance evidence to collect

These are future checks, not tests already passed. Each owner retains the command/output or scenario evidence for their module. Use deterministic local fakes for failures and at least one actual Fuji transfer for integration evidence.

## Baseline v1 checks

- [ ] Compatible install from lockfile, build and typecheck succeed; run the actual project's configured test/lint commands.
- [ ] USD 10.00 fixture debit gives USD 0.20 fee, USD 9.80 principal, THB 343.00 and 9,800,000 test-USDC units. Check rounding boundaries and rejected malformed/out-of-range values.
- [ ] Expired quotes cannot start new transfers; accepted quotes keep their amounts after later delays.
- [ ] Two sessions cannot read or mutate each other's recipient, quote, transfer or idempotency replay.
- [ ] Same-key/same-payload concurrent requests produce one transfer; changed payload conflicts; another key cannot reuse an accepted quote.
- [ ] Funding rejection creates no token payment. Repeated funding events do not create another operation.
- [ ] Wrong chain/token metadata or insufficient test assets block safely without fabricated receipt success.
- [ ] Signed bytes, hash and nonce persist before broadcast. Concurrent/stale processors cannot create a different transaction for the same logical payment.
- [ ] Lost broadcast response and interrupted processing reconcile the stored hash; they do not authorize a fresh payment.
- [ ] Successful receipt with wrong token/from/to/amount never authorizes payout.
- [ ] Confirmed chain transaction followed by database failure is recovered once with one logical payout.
- [ ] Payout failure is visible; retry only payout. Unknown payout reconciles the stable operation ID.
- [ ] Refresh restores saved state; late older-version responses cannot overwrite newer UI state.
- [ ] Closing the page may pause app reconciliation/payout under baseline v1; returning resumes safely. Do not claim autonomous completion.
- [ ] Status GET performs no funding, signing or payout mutation.
- [ ] Responses, logs and client bundle expose no signing key, service-role credential, session secret or raw signed transaction.
- [ ] Actual receipt/hash and simulated funding/payout references are labelled separately. No claimed real bank credit.
- [ ] Public app works in a fresh browser and another device. Test balances cover rehearsals; submission links are accessible to the intended audience.

## Additional checks only if extensions are adopted

- [ ] Estimate cannot be accepted as a final quote; simulated REJECT/REVIEW prevents final-quote issuance.
- [ ] Late funding and funding/expiry races yield one persisted eligibility decision and no unauthorized settlement job.
- [ ] Timely funding followed by chain delay preserves accepted amounts and does not cancel a possibly broadcast payment.
- [ ] Worker progresses with browser closed; restart, lost lease and stale worker recovery prevent duplicate settlement. Observe heartbeat/job age.
- [ ] Optional sponsor failure/timeout/disabled state leaves quote, funding, settlement, payout and status working.
- [ ] Spoken receipt uses saved exact amounts/status and states that bank payout is simulated.

## Retain for judging

Revision and dependency versions, build/test outputs, public test-wallet addresses, actual Fuji hash, verified token-event fields, safe transfer/event history, failure/recovery evidence and a labelled backup recording. Never include credentials or actual identity/bank documents in submission evidence.
