# CentMe browser walkthrough

Run each row in mock mode first, then with `NEXT_PUBLIC_REAL_ENDPOINTS=all`. Mark pass/fail and note the tx hash for real runs.

Mock run: 2026-10-16, branch `frontend-merge-part3` of the backend repo, Playwright Chromium at 1280px and 375px. Real column waits for persons 2 and 3 to merge their routes.

| # | Check | Expected | Mock | Real |
|---|---|---|---|---|
| 1 | Happy path $10 | Review shows ฿343.00 / fee $0.20; receipt amounts match review; completion copy "Demo completed — THB payout simulated." | Pass | |
| 2 | Funding declined (panel) | Step 1 red, no tx hash, Start over | Pass | |
| 3 | Payout failed → Retry payout | Completes; tx hash identical before and after retry; new payout reference | Pass (payout ref 19 → 20, hash unchanged) | |
| 4 | Refresh mid-transfer | Resumes on same step; funding reference unchanged | Pass | |
| 5 | Double-click Confirm payment | One transfer only (Details → one transfer ID; real: one DB row) | Pass (one transfer in mock store) | |
| 6 | Quote expiry on review | "Quote expired", card dims, Get new quote gives a fresh 5:00 | Pass (run with TTL temporarily 10s, reverted) | |
| 7 | Invalid amounts: 0.50, 100.01, 1e2, -5, 10.505 | Inline message under field, Get final quote blocked | Pass (100.01 in browser; the others by `parseUsdInput` unit tests) | |
| 8 | TH toggle on every screen | No English left except product/tech names; no overflow at 375px | Pass (send, review, track + receipt) | |
| 9 | Keyboard only | Tab order logical; Enter submits; Esc closes sheet; focus visible everywhere | Pass | |
| 10 | Reduced motion | No animation; values appear immediately | Pass (receipt shows ฿343.00 at once) | |
| 11 | Incognito: open another session's receipt URL | "We couldn't find this transfer." (real mode) | n/a | |
| 12 | iPhone ntfy push on completion | Banner within a few seconds; text honest about simulation | Partial: ntfy POST returned OK and chip shows; phone not checked yet | |
| 14 | Checks scenario Reject / Review (panel) | Red / amber alert on step 1, no review screen, no quote; Pass → "Checks · Passed · SIMULATED" on review | Pass for Reject and Pass in browser; Review by mock unit test | |
| 13 | Real settlement evidence | TESTNET tag, Snowtrace link opens the real tx, verified time shown | n/a | |
