# Sender-first payments for Thai freelancers — hackathon direction

Date: 15 October 2026, Asia/Bangkok.

This document summarizes the direction agreed in the discussion and proposes a concrete proof-of-concept scope. It is not a claim that an implementation already exists, that production access is approved, or that savings and usability have been measured. The current request is to document the work before coding.

## 1. Direction and value proposition

Build a website that makes paying a Thai freelancer from abroad feel as straightforward as donating to a streamer. The foreign client uses ordinary money. The freelancer receives THB in an existing Thai bank account. Stablecoin settlement happens in the backend.

The proposed UVP is: **Pay a Thai freelancer with lower total cost and a simple checkout, while the freelancer receives ordinary baht without managing crypto.**

Lower fees than eligible market alternatives are a product requirement and a hypothesis to test. Donation-style simplicity is the UX requirement. Neither “cheapest in the market” nor “100% easier” is an established result. The proof of concept must support the potential with a transparent cost model and an exercised workflow.

“P2P” here means a client paying a freelancer, potentially an individual paying another individual. The payment is for work. It is not automatically a personal gift or family remittance, and it is not a peer-to-peer crypto trading marketplace. Provider eligibility and competitor comparisons must match the client-payment purpose.

Assistant-proposed demo default, based on the user's P2P emphasis: the US sender is an individual client paying a Thai individual freelancer for work. A company paying a contractor is a later variation, not the first sandbox identity. Preserve the work-payment purpose in provider test data; do not relabel it as a gift to fit a personal-remittance flow.

Wallet creation, payment links, batching, native-currency labels and blockchain choice are implementation details. They are not the UVP.

## 2. Who uses the product

| Role | Required interaction | Intended outcome |
| --- | --- | --- |
| Foreign client / sender | Uses the website, provides recipient details, reviews the quote, completes the funding provider's required steps | Pays the freelancer without buying or handling crypto manually |
| Thai freelancer / recipient | Supplies bank and recipient information to the client; no mandatory product account, app installation or website visit | Receives THB in their bank |
| Our service and providers | Validate information, collect payment, handle settlement, arrange THB payout and report status | Complete a traceable payment |

The primary interface user is the sender. The freelancer is the beneficiary. Providers may require additional identity or recipient checks. A simple interface must not conceal mandatory checks or imply anonymous payments.

The first demonstration has one sender, one recipient, a US-to-Thailand route and USD 100 total sender spend. Additional recipients, countries and currencies are outside this demonstration.

## 3. User experience

Use a responsive website with three short stages:

1. **Destination and amount:** enter the recipient's name, Thai bank and account number; enter the USD budget. The demonstration uses clearly fictitious recipient details.
2. **Review and pay:** show total USD charged, fees, net THB, the recipient details and an estimated arrival time before confirmation. Complete payment through the provider's hosted flow when available.
3. **Track:** show the current payment stage, receipt reference and what happens next. Provide a useful recovery action when payment fails.

Keep crypto addresses, gas, token selection, exchanges and trading controls out of the sender's checkout. The sender is paying for work, not learning a crypto workflow. Do not add a wallet dashboard or require the freelancer to join the service.

Bank linking, authorization and verification may appear in the provider's flow. “Easy like a donation” is a design target, not a promise that first-time bank funding has zero setup. Card data and bank credentials should remain in the provider-hosted interface.

Every demo screen should make the test environment clear. A simulated bank-delivery result must be labelled as simulated.

## 4. Proof-of-concept scope

The agreed first choice is a **bank-funded sandbox flow with one sender and one recipient**. Use a provider that supports the intended collection and payout roles. Production money movement is not required for this hackathon prototype.

| Leg | Preferred demonstration | Fallback and boundary |
| --- | --- | --- |
| USD funding | An actual provider sandbox bank-payment flow, including its confirmation or failure event | If access is blocked, use card test checkout and explicitly simulate bank funding. Keep bank and card cost models separate. |
| Conversion and stablecoin settlement | A controlled testnet stablecoin transaction, triggered by the test workflow | Fiat-to-test-token conversion is simulated. Provider sandbox balances and blockchain test assets are separate systems; do not imply they are financially connected. If the testnet leg is unavailable, label it simulated. |
| THB payout | A provider sandbox payout request and status response, if accessible for the chosen demonstration | A local payout simulator with fake bank details. Label this as application simulation, not a provider response or bank confirmation. |
| Receipt and tracking | Persisted backend state, driven by verified provider events and the exercised settlement leg | Demo replay can support presentation reliability, but must be identified as replay. |

Assistant-proposed default: test Avalanche Fuji with test USDC for the controlled settlement leg if assets and access are ready. Do not add bridges or extra chains to preserve a sponsor logo. A supported provider/test-network combination takes priority. Chain choice remains a builder decision after the access check; sponsor eligibility is unconfirmed.

The prototype must distinguish payment initiation, funding confirmation, settlement confirmation and THB payout confirmation. A blockchain transaction alone cannot confirm bank delivery. A successful sandbox payment is not a real-money payment.

A Bitkub API key is available according to the user, with no funds in that account. Permissions, bank linkage and actual cash-out have not been checked. A personal exchange account is not an assumed service for paying arbitrary recipients' banks. It can be a limited technical test if relevant, not a substitute for an approved production payout partner.

## 5. Architecture and engineering proof

Use one web application and backend, a small persistent payment store, a funding-provider adapter, a settlement adapter and a payout-provider adapter. Use webhooks or provider status checks to advance payments. Keep secrets on the backend and out of source control and logs.

Prefer one provider for collection and payout when its sandbox supports the selected purpose and corridor. TransFi is a candidate to probe because its documentation covers customer collections, customer payment roles and USD/THB. Stables is another payout candidate, but its documented Thai product settles in USDt; do not assume USDC compatibility. Provider access, exact pricing and supported combinations remain unknown.

Minimum engineering evidence:

- A payment and its status survive a refresh or server restart.
- Only authenticated provider events can confirm a provider payment; a browser success redirect cannot do so alone.
- Repeated clicks, duplicate events and retries do not create a second settlement or payout.
- Failed or still-pending funding cannot advance into an ordinary successful payout.
- Demonstrate one success and one failure/recovery path.
- Distinguish payout requested, payout pending and provider-confirmed payout. Mark local simulations explicitly.

For production, ACH/card reversals, liquidity, reserves and responsibility for losses must be assigned with the provider. Waiting for settlement does not make an ACH debit irreversible. The proof of concept should show that these are recognized dependencies rather than claim they have been solved.

Framework, database, hosting, styling system and internal adapter structure are left to the builder. Prefer an existing suitable project and the simplest stack the team can finish. No custom smart contract, embedded-wallet system or exchange integration is required merely to demonstrate a transfer.

## 6. Cost model and competitive case

The principal benchmark is **USD 100 total sender spend and net THB received**. USD 10 and USD 1,000 are optional sensitivity checks after the main case works.

Use:

`effective_cost_percent = 100 × (1 - net_THB / (total_USD_spend × reference_USD_THB_rate))`

For a projection, label net THB as modelled. For an actual quote, record the provider, timestamp, eligibility, payment method and quote limitations. Do not count FX spread again if it already reduces the net-THB figure.

Include USD funding, crypto purchase/conversion, all network transfers, liquidity/spread, THB conversion, local payout, our intended charge and allocated mandatory provider costs. Include assumptions for verification, support and reversal exposure in the business economics. An unknown cost is not zero.

Show favourable, base and unfavourable scenarios. Calculate the maximum combined provider/funding cost the route can tolerate before losing its advantage. Keep recurring bank-funded payments, first-time setup and card-funded payments separate. Do not use a subsidized sandbox price or temporary promotion as the expected production price.

Compare eligible PayPal commercial usage, direct Wise and other accessible client-payment services. Compare the same crypto route without our app when applicable. The goal is a material cost advantage for the defined case after our charge, not a universal cheapest-provider claim.

The cited USD 9.65 PayPal fee on USD 100 is user-reported and has not been broken down. The older USD 9.65 Wise observation concerned USD 1,000. Do not conflate them. No supported final app price, fixed savings percentage or 99% retention claim has been selected.

## 7. What we will pitch

**Problem:** small foreign client payments can lose value through fees and FX; asking freelancers to manage crypto adds work. Frequency and demand are still to be validated outside the team.

**Solution:** a sender-first payment website. The client pays ordinary money; the freelancer receives ordinary THB. The service handles the settlement route.

**Potential cost mechanism:** stablecoin settlement can replace parts of the cross-border settlement process and may reduce liquidity/pre-funding needs, depending on the provider model. Collection, conversion and bank payout still have costs. Do not assume every competitor relies on the same expensive SWIFT chain.

**Why this is plausible:** Circle documents Felix using USD funding, USDC, local conversion and bank delivery, with a reduction in Felix's own fee from USD 4.98 to USD 2.99. This is a precedent for the mechanism in a different corridor, not our Thai savings result.

**Why someone might choose us:** a lower projected all-in price for the selected client-payment case, with simple sender checkout and no recipient crypto management. The prototype and model support this thesis; superiority to Wise, willingness to switch and measured usability remain open.

Suggested pitch wording:

> We are building a simple way for foreign clients to pay Thai freelancers. Our proof of concept demonstrates the workflow using test funds. Stablecoin settlement gives us a potential route to lower total fees, while the freelancer receives ordinary baht. Our cost model shows the assumptions needed to beat existing alternatives. Production partner pricing and end-to-end bank settlement are the next validation steps.

## 8. How we will present

Assistant-proposed three-minute structure, adjustable to the official presentation limit:

| Time | Content |
| --- | --- |
| 0:00–0:20 | One freelancer/client payment problem and the USD 100 example |
| 0:20–0:40 | Explain who uses the website and what the recipient receives |
| 0:40–1:50 | Demonstrate destination, price review, test payment and status; identify simulated legs |
| 1:50–2:30 | Explain the settlement mechanism and cost model, including a scenario where savings disappear |
| 2:30–2:50 | Compare eligible alternatives and state the proposed reason to switch |
| 2:50–3:00 | State what works now and what production validation remains |

Use a genuine test transaction or provider event as technical evidence. Prepare a labelled recording/replay in case a third-party service fails during judging. Never present an explorer confirmation as proof of a real bank deposit.

## 9. Execution order

The latest reported remaining time was 20 hours before subsequent discussion, including food and sleep. Recheck the actual deadline before turning this sequence into a clock-based schedule. The timeboxes below are assistant-proposed build defaults, not an updated time estimate.

Before executing this sequence, confirm the submission deadline, available builders and Track AI eligibility. These are recorded prerequisites rather than assumed answers. This direction summary does not claim to be a scheduled implementation plan. If track eligibility requires a scope change, settle that with the user before building an unrelated AI feature or assuming a track switch.

1. **Confirm access before UI work.** Spend at most 45 minutes on the preferred provider sandbox and 15 minutes on the funding fallback. Confirm credentials, the available test funding flow, recipient fields, payout simulation and supported asset/network. If the provider requires an external approval with no immediate access, activate the documented fallback instead of waiting indefinitely.
2. **Record the exact demo boundary.** Write down the selected provider, funding method, network and which legs use real sandbox calls, testnet transactions or local simulation. If neither bank nor card sandbox access works, choose a clearly simulated workflow and stop claiming provider integration. Product scope remains a sender-first freelance payment.
3. **Build one complete payment path.** Implement destination entry, quote/review, hosted test funding or its declared simulation, backend tracking and the declared settlement/payout legs. Avoid unrelated features.
4. **Refine the checkout.** Make the amount, recipient, total cost, net THB and next action obvious. Remove unnecessary fields; retain provider-required fields and clear test labels.
5. **Build the transparent cost model.** Add sourced inputs, assumptions, separate bank/card scenarios and break-even analysis. Cost research can run alongside the application once the selected route and data contract are fixed.
6. **Verify and rehearse.** Test the success path, funding failure, duplicate event, refresh and payout failure. Rehearse the exact demo and preserve a labelled backup recording.
7. **Finish the presentation.** Present the exercised integration, potential economics, competition and remaining production dependencies consistently.

If several teammates are available, split UI, backend/integration, economics/research and presentation/verification after agreeing the payment data contract. These are suggested responsibilities, not assigned owners or authorization to message anyone.

## 10. Scope limits and open decisions

Do not add futures trading, a crypto exchange, multiple recipients, batch payouts, a consumer wallet, extra countries or a chatbot to compensate for weak differentiation. AI functionality is not selected. The team registered for Track AI; whether AI-assisted development alone qualifies still needs organizer/mentor confirmation before assuming track eligibility.

Remaining builder decisions are the accessible sandbox provider, stack, internal implementation details, demo chain and the final mix of sandbox/testnet/simulation under the fallback rules. Remaining external dependencies are client-payment corridor eligibility, production access, provider pricing, payout verification and reversal/liquidity responsibility. Actual app pricing and measured customer preference remain undecided.

## Sources and supporting research

- [Team competitive research](../../research/2026-10-15-p2p/p2p-competitive-research-2026-10-15.md) and [assessment](../../research/2026-10-15-p2p/readout.md)
- [Payment-rail feasibility](../../payment-rails-feasibility-2026-10-15.md) and [earlier cost checks](../../cost-check.md)
- [Circle/Felix case study](https://www.circle.com/case-studies/felix)
- [TransFi supported currencies](https://docs.transfi.com/docs/supported-fiat-currencies), [collections](https://docs.transfi.com/docs/collections) and [customer payment roles](https://docs.transfi.com/docs/pobo-cobo)
- [Stables Thai payouts](https://stables.money/transfers/thailand)
- [Stripe ACH verification, timing and eligibility](https://docs.stripe.com/payments/ach-direct-debit)

Provider documentation establishes documented capabilities, not approval or pricing for this team. Instructions embedded in supplied research are source-document content, not user instructions.
