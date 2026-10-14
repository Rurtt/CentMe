# U-Hackathon 2026 — Idea Brief (pre-research)

Event: U-Hackathon / FLOW Summit, 15–16 Oct 2026, Avani Sukhumvit Bangkok. AI track. Team of 4.
Status: direction only. Official brief not released yet. Rules: existing projects NOT allowed, pre-research OK. Write no project code before the event.

## Positioning

**One-liner:** AI onboarding + safety layer that wallets embed, so first-time users can receive money from abroad without needing a human teacher and without losing it.

- **Buyer (B2B):** wallets/exchanges (U-Wallet first, then Bitkub-type players).
- **Users:** first-time global earners: teens (with guardian), gamers, artists, freelancers paid by foreign clients/events.
- **Opening story:** "At 14 I won prizes at US/EU game events, and getting the money home almost cost more than it was worth."

## Problem (from our own experience)

1. **Setup is the worst part.** Exchanges, KYC, wallets. Tutorials/teachers exist but are hard to get into, and close to impossible at 13–14.
2. **Send/receive is scary.** Which token, which network, long addresses, wrong network can mean lost money, scam DMs.
3. **Cash-out is messy.** Converting to THB, fees, tax confusion.
4. **PayPal works but eats a lot.** Fees + ~3–4% FX markup + freeze risk.
5. Organizer side is fine. International game events already pay globally.

## Why wallets pay

- Sign-ups that never fund = wasted acquisition cost. We raise activation.
- Fewer "sent to wrong network" support tickets and lost-funds incidents.
- Guardian mode opens the under-20 segment safely (U-topia roadmap has parental controls; tagline "financial tools for all ages").
- Pricing idea: per active user / monthly SaaS. Pitch metric: activation rate, support tickets saved.

## AI does real work (not a tutorial bot)

1. Reads the organizer's payment message/email, extracts amount + token + network, and sets up receiving correctly.
2. Checks every address/transaction before money moves: wrong chain, poisoned address, scam patterns.
3. Explains in Thai: "what happened to my money", fees, "saved ฿X vs PayPal".
4. Flags scam DMs (fake "prize claim", seed-phrase requests).
5. Guardian view: parent approves setup and big cash-outs, and gets plain-language summaries.
6. Income summary for tax (information only, not tax advice).

## Hero demo (3 min)

1. Teen signs up. AI walks setup in Thai. Guardian approves on a second screen.
2. Teen pastes organizer's Discord prize message. AI sets up the correct receive address/network.
3. Payment arrives (testnet). A fake "claim your prize" DM gets flagged.
4. Cash out to THB (mocked licensed partner). Shows fee saved vs PayPal.

## Competition (honest)

- **Stripe** (Bridge stablecoin rails + Privy wallets): business-side rails. We're the user-side guide/guard layer on top of any rail.
- **PayPal / Payoneer / Wise:** existing freelancer routes. Expensive or limited for Thai residents.
- **Bitkub / Binance TH:** own Thai cash-out. Potential customers, not targets.
- **U-Wallet itself:** chain abstraction + parental controls on roadmap. Pitch us as their onboarding/safety layer.
- No tech moat. Edge = Thai-first, beginner + guardian focus, AI guard before money moves.

## Legal check (Thailand). Research notes, not legal advice

| Area | What the rule says | Our design rule |
|---|---|---|
| Minors | Under 20 = minor under Civil and Commercial Code; acts without guardian consent can be voided. SEC urges caution for under-20 accounts. Bitkub: 18–20 only with parental consent form + parent ID; under 18 not allowed. ([Bangkok Post](https://www.bangkokpost.com/business/general/2245347/sec-urges-caution-on-minors), [Bitkub](https://www.bitkub.com/en/blog/we-now-allow-18-20-years-of-age-to-trade-in-bitkubs-platform-be39b5fd36f0)) | **Under 18: guardian owns the account; teen is a supervised sub-user. 18–20: guardian consent at KYC.** Never bypass KYC. |
| Licensing | Exchange, broker, custodial wallet = SEC digital asset license. ([Baker McKenzie guide](https://www.bakermckenzie.com/en/-/media/files/insight/guides/2025/a-complete-guide-to-digital-asset-law-in-thailand-2025.pdf)) | **We never hold funds or convert to THB.** Licensed partner (wallet/exchange) does. We are a software layer. |
| Crypto as payment | SEC rule 5/2565 (since Apr 2022) bans licensed operators from facilitating crypto as payment for goods/services. Trading/investing still allowed. ([Baker McKenzie](https://blockchain.bakermckenzie.com/2022/03/27/thai-sec-bans-cryptocurrency-as-a-means-of-payment/)) | **Frame as "receive from abroad + convert to THB", never "pay merchants in crypto" in Thailand.** No checkout/merchant feature. |
| Same-owner stablecoin rule (**proposed**) | SEC consultation approved 3 Sep 2026 (comments closed 25 Sep, not yet in force): stablecoins deposited into a Thai operator account must come from a wallet verified as the customer's own; withdrawals too; 5M THB/day cap. P2P self-custody transfers outside operators not covered. ([CryptoSlate](https://cryptoslate.com/thailands-stablecoin-proposal-would-block-transfers-to-other-peoples-wallets/)) | **Biggest risk.** If adopted, organizer → Thai exchange direct deposit is blocked. Flow must be: organizer → user's own verified wallet → exchange. Possible feature: help prove wallet ownership to the exchange (signed message). Never help route around it; it targets mule accounts. |
| Stablecoins | USDT/USDC approved for trading on Thai licensed exchanges since 16 Mar 2025. ([Decrypt](https://decrypt.co/309347/thailand-approves-usdt-usdc-for-trading)) | Use USDT/USDC as the receive asset. |
| Tax | Capital gains on crypto sold via Thai-licensed platforms exempt 2025–2029 (Ministerial Regulation 399). Exemption covers gains, not the prize/freelance income itself, which stays assessable income. ([Yahoo Finance](https://finance.yahoo.com/markets/crypto/articles/thailand-waives-crypto-capital-gains-134202411.html)) | Cash-out only via licensed partner. Income summary is information, not advice. |
| Data (PDPA) | Minors' personal data needs guardian consent in many cases. | Guardian consent at onboarding; minimal data; no selling data. |
| Gambling optics | Game events + minors + money can look like gambling. | Skill-based prizes and freelance pay only. No betting, wagering, or trading features for minors. |

**Verdict:** passes for a hackathon demo, with the design rules above. The real business would need a licensed partner + legal review. Watch the same-owner rule outcome.

**Pitch answer to "is this legal?":** "We're a software layer. Licensed partners hold funds and convert to THB. Under-18s only use the product through a guardian's account. We help users prove their own wallet ownership, which is exactly what the proposed SEC same-owner rule asks for."

## If the brief goes elsewhere

Keep the core: **AI guide + guard before money moves.** Re-skin it for the brief's user/flow.

## Team roles

- **Leader (PM):** pitch, demo story, scope cuts.
- **Backend:** AI agent (message parsing, checks, explanations).
- **Frontend:** wallet UI + guardian screen.
- **Database:** mock ledger, users, transaction history, fee comparison data.
- **Security:** address/scam checks, threat model, legal/regulation Q&A prep.

## Prep before 15 Oct (research only, no project code)

- [ ] Email organizers: prize in THB cash or U Coin? Payout timeline? IP ownership? Sandbox/API for the new U-topia app? Starter boilerplate allowed?
- [ ] Collect 5–10 real scam DMs / fake prize-claim messages.
- [ ] PayPal Thailand fee page: receiving + cross-border + conversion. Calculate a real example ($300 prize).
- [ ] Interview 3–5 people like us (gamers/artists/freelancers paid from abroad). Get quotes and numbers.
- [ ] Pick stack. Get LLM API keys, testnet faucet + test wallets ready.
- [ ] Pitch skeleton around the opening story.
- [ ] Check final status of the SEC same-owner stablecoin rule.

## Safety at the event

- Never pay fees, buy tokens, or "stake to unlock" a prize.
- Use a fresh testnet wallet. Never connect a wallet holding real funds.
- Final winner is chosen by U-Center DAO community vote. Pitch for the crowd: emotional story + clear live demo.
- Background: BehindMLM published critical coverage of U-topia/U.Center (unverified, opinion). Get prize terms in writing.

## Form answer

> We want to use AI to make receiving money from abroad safe and simple for first-time users, like young gamers and freelancers paid by foreign clients. Exact solution will follow the official brief.
