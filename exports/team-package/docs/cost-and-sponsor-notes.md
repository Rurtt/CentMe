# Cost, claims and optional sponsor work

Prepared: 15 October 2026, Asia/Bangkok. This is a concise planning summary of our repository's research limits. It does not provide current provider pricing, legal clearance or verified event eligibility.

## Cost hypothesis

Cheap chain gas does not establish cheap end-to-end remittance. Measure the sender's total debit and recipient's actual net proceeds under matched funding asset/method, corridor, amount, timing and reference FX rate.

All-in cost percentage:

```text
100 * (1 - net THB / (total USD debit * reference THB per USD))
```

Include funding fees, conversion/spread, token acquisition, settlement gas, payout fees, infrastructure, capital/reserves and losses as applicable. Count sponsored gas as a cost even when the sender does not pay it separately. Separate card-funded and bank-funded comparisons. Model favorable/base/unfavorable scenarios and show which inputs are unverified.

Our USD 10.00 / THB 343.00 API example uses a 2% included fixture fee and 35 THB/USD. It is illustrative application arithmetic, not a live quote, chosen business price or evidence of savings.

No executed matched comparison proves we are cheaper than Wise or another accessible route. Local simulation does not prove customer demand or production economics. Recheck official prices and product/account eligibility before a pitch comparison; historical research values are not included as current prices here.

## Production boundary

This demo does not collect actual USD or pay a Thai bank. Production requires an approved corridor/product, partner access, appropriate compliance and legal roles, custody/treasury design, reconciliation, recovery and customer obligations. A provider API key or a successful testnet transaction does not establish those conditions.

Potential providers in prior research are candidates, not selected integrations. No provider signup is required for the current locally simulated fiat flow. Avoid unsupported legal or fee claims in the presentation.

## Sponsor priority

1. Complete and verify the actual Avalanche Fuji token leg.
2. Use U-bot during development if accessible and retain genuine output/session evidence. Qualification for development-only use needs confirmation.
3. Consider ElevenLabs only after the core works: optional user-triggered spoken receipt from the saved server-owned snapshot, explicitly describing simulated payout.
4. Consider Tokenomist only after the core works: useful read-only operator/research token context if relevant AVAX data and access are available. Tokenomics is not FX, gas pricing or proof of stablecoin safety.

The reported extra 5% is an objective, not an award. Verify whether it is total/per-sponsor/cumulative, what usage qualifies and what submission evidence is required. Our old scope and friend's v2 disagree on track selection; confirm actual registration and rules. Do not add a custom contract or chatbot from an unverified eligibility assumption.

Keep optional keys server-side, set bounded timeouts and preserve text receipts/core flow when sponsor services fail. No sponsor request should hold a settlement lock or change payment decisions.

## Presentation wording

Safe current claim: "We propose a fiat-facing payment prototype with simulated banking and actual testnet settlement."

After implementation and verification, demonstrate the observed token transaction and clearly labelled simulated payout. Cost savings, real bank delivery, licensed production operation and awarded bonus points require separate evidence.
