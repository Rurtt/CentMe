# Payment rails feasibility — 2026-10-15

Research notes, not an approved product design or implementation plan. No product code or payment accounts were created, and no funds were moved.

## Current facts

- The user prefers THB deposited into a Thai bank account as the receiving outcome.
- At the start of this research, the user reported 20 hours remaining, including time needed for food and sleep.
- The user has Binance Global, not Binance TH. No eligible Thai exchange account ready for testing has been established.
- Later update: the user reports having a Bitkub API key and no funds in that account. Key permissions, account eligibility, supported deposit networks and approved bank linkage have not been checked. Do not read or request the secret in chat, and do not treat key possession as proof of successful cash-out.
- Payers reportedly use PayPal and sometimes crypto. Willingness to switch to cards, bank transfers, or USDC remains unmeasured.
- The user cited USD 9.65 in PayPal fees on USD 100. This is user-reported, not a verified transaction breakdown. Separately, the existing cost-check document records a Wise ACH quote of USD 9.65 on USD 1,000; do not conflate them.

## Findings from official sources

### Wise: real bank delivery exists, platform access requires onboarding

Wise supports THB delivery to supported individual and business bank accounts in Thailand. This is an existing baseline, not a product advantage for this project.

Platform credentials and access scopes are issued during partner onboarding. Business personal API tokens have limited endpoint access and are not intended for partner account integrations. Sandbox testing does not establish production access.

Sources: [THB transfers](https://wise.com/help/articles/2932335/guide-to-thb-transfers), [API access](https://docs.wise.com/guides/developer).

### Stripe: practical sandbox candidate, expensive relative to a low-cost claim

Thailand standard pricing lists international cards at 4.75% + THB 10, with an additional 2% when currency conversion is required. For a USD 100 charge requiring conversion, those stated components alone are USD 6.75 equivalent plus THB 10. This excludes applicable tax, platform/Connect charges and any other relevant costs; it is not a final net-THB quote.

A new account can test in sandbox; live services require business verification and activation. The payout documentation lists Thailand settlement timing as 7 business days. An accepted card payment is therefore not proof of money arriving in a Thai bank within this hackathon deadline.

Receiving a merchant's own sales and operating a platform paying multiple independent recipients are different integration scopes. Connect cross-border payouts are not universally self-serve. Global Payouts lists THB wire delivery to Thailand, but sender-business availability is US/GB, with specified other countries in private preview; Thailand is not listed as an available sender-business country.

Sources: [Thailand pricing](https://stripe.com/en-th/pricing), [account setup](https://docs.stripe.com/get-started/account/set-up), [payout timing and Thailand test bank details](https://docs.stripe.com/payouts), [test payments](https://docs.stripe.com/testing), [Connect cross-border restrictions](https://docs.stripe.com/connect/cross-border-payouts), [Global Payouts availability](https://docs.stripe.com/global-payouts), [recipient countries](https://docs.stripe.com/global-payouts/recipient-requirements).

### Bitkub: documented THB withdrawal API, no ready account established

Official API V4 documents approved-bank-account lookup, fiat withdrawal submission, crypto deposits and withdrawal history. API V3 contains trading operations. This is a plausible receiver-owned exchange integration to investigate if an eligible account is already ready; documentation alone does not prove that the team's account can execute it.

Published ordinary THB-pair trading fees are 0.25%; the withdrawal page lists THB 20. These do not include fiat-to-crypto acquisition, gas, spread, slippage or app costs. USDC pair availability, exact deposit network, deposit restrictions and the account's API permissions were not verified. Do not assume Avalanche/Fuji compatibility or production readiness.

Bank withdrawals target approved accounts associated with the authenticated exchange user. This does not establish a service able to distribute arbitrary customers' funds to arbitrary bank accounts. Direct use of Bitkub remains a required usability and cost baseline.

Sources: [API V4](https://github.com/bitkub/bitkub-official-api-docs/blob/master/rest-v4.md), [API V3](https://github.com/bitkub/bitkub-official-api-docs/blob/master/rest-v3.md), [trading fees](https://support.bitkub.com/en/solutions/articles?id=151000035191), [THB withdrawal](https://www.bitkub.com/en/withdraw).

### Transak: staging access exists; production and THB coverage unresolved

Transak says staging keys are available after partner signup and production keys require KYB approval. Off-ramp can use a hosted flow/widget. Its current whitelabel API documentation marks off-ramp unsupported, so do not assume a fully native API off-ramp.

The coverage page did not establish Thai KYC plus THB bank withdrawal in this research. Absence from the extracted page is not proof of non-support. No executable THB quote was obtained. Sandbox documentation includes test tokens and networks, but does not establish the proposed Fuji-USDC-to-THB route.

Sources: [partner signup and KYB](https://docs.transak.com/guides/how-to-create-partner-dashboard-account), [off-ramp integration](https://docs.transak.com/products/off-ramp), [whitelabel constraints](https://docs.transak.com/integration/api), [coverage](https://transak.com/global-coverage), [sandbox](https://docs.transak.com/guides/sandbox-credentials).

### Triple-A: a future partner candidate, not a deadline dependency

Local-currency payout documentation describes fiat/crypto-funded payouts. Dashboard creation is described as occurring within 24 hours after contract signing and successful KYB. Country/currency activation requires an account manager and a small test. THB coverage and executable pricing were not confirmed. The 24-hour statement does not include the time needed to complete contracting and KYB.

Sources: [local payouts](https://support.triple-a.io/knowledge/what-is-a-local-currency-payout), [dashboard access](https://support.triple-a.io/knowledge/how-can-i-create-a-dashboard-account), [country activation](https://support.triple-a.io/knowledge/how-do-i-activate-a-new-local-currency), [public coverage](https://www.triple-a.io/global-payment-coverage).

## Decision supported by this research

### Later funding-method check: sender-first freelance payments

The current question is bank funding versus cards for a sender-first website paying Thai freelancers. An assistant recommendation is to test a bank-funded sandbox route first because cost is the primary hypothesis; a card checkout remains a possible demo fallback, not evidence for the bank-funded route's projected economics. No funding method has been approved or integrated.

US bank funding can use a provider-hosted bank-debit flow (account verification plus authorization) or a provider-issued virtual account for a payer-initiated bank transfer. These are different experiences; do not describe both as an instant card-like checkout. TransFi documents virtual-account collections and waiting for its `fund_settled` event, but this does not establish the team's access to a US bank-funded client-payment corridor. [Collections](https://docs.transfi.com/docs/collections)

Stripe ACH Direct Debit documents bank verification and authorization, standard T+4 settlement and T+2 for eligible US users. Personal-account debits can generally be disputed for up to 60 calendar days; settlement is therefore not equivalent to irreversible funding. Thailand is absent from the documented business-location eligibility list. Do not promise that an ordinary Thai Stripe account can enable production ACH or that an ACH authorization immediately funds an irreversible stablecoin payout. These timings are Stripe-specific examples, not universal ACH promises. [ACH documentation](https://docs.stripe.com/payments/ach-direct-debit)

Coinbase's current overview lists US ACH bank transfers and supported debit-card methods, with availability determined by its Config/Options APIs. Buying crypto through an onramp may add payer eligibility, account or identity requirements. General method support is not an executed funding quote or corridor approval. [Onramp overview](https://docs.cdp.coinbase.com/onramp/introduction/welcome)

Suggested engineering proof: one eligible provider sandbox path, a persisted payment state machine, signed webhook handling, duplicate prevention and a demonstrated funding/payout failure. Separate funding eligibility, onchain confirmation and bank-delivery confirmation; never mark bank delivery complete solely from a blockchain transaction. Production payout timing and return/chargeback responsibility remain provider-contract dependencies.

An end-to-end production system receiving customer USD and delivering verified THB bank deposits is not a dependable 20-hour commitment with the access currently established. This is a project-specific feasibility assessment, not a claim that the payment route is impossible.

A functional sandbox prototype is the strongest technical fallback: a persisted payment request, provider sandbox checkout, authenticated server-side status updates, and explicitly simulated bank-delivery states. Stripe is a candidate for the fiat-flow technical test, not a validated low-cost product recommendation. API-key access and a first sandbox transaction should be checked before committing the remaining build time. Do not build both a fiat integration and a blockchain integration merely to inflate the demo.

If provider sandbox access cannot be obtained promptly, a clearly labelled interactive mock-up can demonstrate the proposed experience. It cannot prove costs, real payment execution, bank settlement or demand. No screenshot or status must imply a real bank deposit occurred when it did not.

## Value gate still open

The user subsequently made cost savings the primary decision criterion and explicitly questioned whether an easier interface alone is enough for the hackathon. The sandbox-first recommendation does not resolve that objection. Prioritize a bounded cost-feasibility check before building the payment UI; a mock-up cannot validate savings.

One additional funding candidate is Coinbase Onramp, whose official materials advertise no-fee USDC for selected integrations. This is a lead, not an approved or executable route for this team. The current Onramp Quote documentation accepts a payment method, US state, asset and network and returns payment total, crypto received, Coinbase fee and network fee. It explicitly describes quotes as estimates that may differ from execution. Obtaining a relevant quote requires provider access; no such quote was obtained here. USDC on Base does not automatically match Bitkub deposit support, and any extra transfer, swap or bridge must be counted.

Sources: [Coinbase Onramp](https://www.coinbase.com/developer-platform/products/onramp), [Onramp Quote limitations and fields](https://docs.cdp.coinbase.com/onramp/coinbase-hosted-onramp/generating-quotes). Public Bitkub ticker URLs were not accessible through the web tool, so no live order-book-based net-THB estimate was established.

Suggested cost gate, not a user-approved threshold: same USD 100 total payer spend, same recipient bank endpoint and comparable timing; include funding, network, conversion, spread, bank withdrawal and intended app charges. Compare an eligible account-specific PayPal transaction, direct Wise and the same crypto route without this app. A material saving such as 30% below direct Wise is a proposed continuation threshold, not a measured result. If the gain only beats PayPal, say precisely that; if direct crypto use is equally cheap, app value must come from a separately measured workflow improvement.

The proposed outcome is: a foreign client pays using ordinary money, and the Thai recipient receives more net THB with less work, without managing crypto. The ease, savings and payer willingness must still be measured against eligible PayPal usage, direct Wise, and direct exchange usage where applicable.

Wallet creation, batching, payment links and a Stripe wrapper are not established UVPs. A working sandbox demonstrates integration behavior; it does not establish differentiation. Do not turn this research recommendation into an approved build or a claim of cheapest-market pricing.
