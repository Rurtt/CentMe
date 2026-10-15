# Cross-border payment sandbox scope and next steps

Updated: 2026-10-15, Asia/Bangkok.

This document summarizes the latest discussion and reviews the supplied flow diagram. The intended deliverable is a working web application using test funds, with clear evidence for each exercised integration. It should explain the proposed USD, stablecoin and THB route without claiming real bank delivery or production readiness.

The user has now confirmed the demo boundary: simulate USD funding and THB payout. The user also confirms that the AI track means creating with AI tools; an AI feature inside the product is not required. These decisions supersede the earlier provider-first access gates and unresolved AI-track questions.

This is a direction summary for review, not an implementation-ready specification. No provider API transaction, testnet transaction or production permission has been verified. The user reports obtaining a Coinbase server-side Secret API Key, but Coinbase integration is deferred and the key is not required for this demo. Product code has not been built in this workspace.

Latest engineering handoff: [API contract](../../api-contract.md) defines proposed v1 requests, responses, money rules, state enums and safe resumable progress. [Comparison](../../handoff-comparison.md) records the useful engineering details adopted from the friend's ZIP. Review these before parallel implementation; no endpoint exists yet.

## 1. Decisions and open choices

| Topic | Current position |
| --- | --- |
| Prototype | The user accepts fake/test funds and wants a functional sandbox web app that demonstrates the idea and architecture. |
| Product ambition | The supplied feasibility document describes general P2P transfers between the US and Thailand, in both directions. This is source-document scope, not proof that either corridor is accessible. |
| First demonstration | Current planned slice: one US individual sending USD to one Thai individual receiving THB, for a personal-transfer purpose. The broader P2P use case remains the working direction; the newly confirmed technical boundary is simulated USD funding and THB payout. |
| Freelance payments | An alternative first use case if paying for work is the actual target problem or the approved provider program supports that purpose. Do not disguise a personal transfer as an invoice or vice versa. |
| Reverse direction | THB to USD remains a possible later direction. It needs separate provider, FX and legal validation. |
| Funding | Confirmed: local USD funding simulation. No Coinbase, TransFi, card or bank payment integration is required for this demo. |
| THB payout | Confirmed: local THB conversion and bank-payout simulation. No real bank deposit occurs. |
| Provider | TransFi signup is blocked for the user by the business-email requirement. Coinbase setup is deferred. External fiat-provider access is no longer a demo prerequisite. |
| Stablecoin and chain | Recommended demo target: Circle test USDC on Avalanche Fuji C-Chain. Verify test AVAX, test USDC and one transfer before relying on it. This does not select a production provider route. |
| AI | User confirms AI-assisted development satisfies the track's purpose. No in-product AI model or chatbot is planned. |
| Name | Undecided. The user rejected Rabli and the proposed naming direction. Do not use Rabli as a selected brand or invent the user's naming preferences. |

## 2. Review of the supplied flow diagram

The diagram is broadly correct as a conceptual journey: sender chooses destination and amount, reviews a quote, passes checks, funds a transfer, and tracks settlement and bank payout. Keeping crypto management out of the user's tasks fits the intended experience.

Apply these corrections before treating it as a build specification:

1. **Show one active direction in the first demo.** Supporting both directions doubles integration and validation work. Omit the reverse direction or mark it unavailable, rather than presenting it as exercised functionality.
2. **Separate an estimate from a final quote.** An estimate may appear before verification. Revalidate the rate, fees, recipient proceeds and expiry after checks and before funding authorization. Define what happens if funding arrives after the quote expires.
3. **Confirm funding availability before settlement.** In this demo, generate a local simulated funding event and persist it before sending test tokens. For future provider integration, a sender's click or authorization alone does not establish available funds; apply the provider's funding and return-risk rules.
4. **Treat the settlement drawing as a proposed mechanism.** A provider may use internal balances, pooled liquidity or later treasury settlement. Do not assume every customer transfer creates a separate observable blockchain transaction.
5. **Separate test systems honestly.** A sandbox USD balance does not buy financially backed testnet USDC. If a testnet transfer is triggered by a sandbox event, that is an application-level demonstration link between separate test systems.
6. **Add failure handling at every leg.** Verification, funding, quote expiry, settlement, conversion and payout can all fail. A timeout is an unknown outcome, not confirmed failure. Reconcile before retrying a potentially completed payment.
7. **Require separate payout status for completion.** A transaction hash supports onchain settlement only. Our local payout simulator generates a separate completion event; show "Demo completed — THB payout simulated." Do not represent that local event as a bank or provider confirmation.
8. **Make refunds conditional.** Pending, rejected and returned payments need different actions. An irreversible settlement cannot simply be undone. Model who holds the funds and what recovery is possible before promising a refund.
9. **Keep notifications practical.** An in-app receipt and status page are enough for the first demo. Recipient contact or verification may be provider-required, but do not add a mandatory recipient app or assume both users have accounts.

The diagram labels fiat steps as simulated and the middle transfer as testnet. That now matches the selected technical boundary. It demonstrates application orchestration and the exercised testnet leg; it does not establish external fiat-provider integration.

## 3. Proposed first demo flow

1. Display test mode and the supported US-to-Thailand direction.
2. Enter USD budget and a fictitious Thai recipient's required details.
3. Show estimated fees, net THB and arrival assumptions.
4. Complete clearly labelled local simulations of identity and recipient checks using synthetic data. These are not actual KYC or bank-account verification.
5. Refresh the quote if needed; sender reviews and confirms the final test instruction.
6. Create a persisted transfer and local simulated USD funding order.
7. Process the simulated funding success or failure. Failed funding prevents settlement and payout.
8. Represent USD-to-stablecoin conversion as a simulation. Transfer prefunded test USDC between two dedicated demo settlement wallets on Fuji, then verify the receipt and expected token-transfer event. The test tokens do not represent purchased or redeemable USD.
9. After confirmed testnet settlement, simulate THB conversion and create a local payout order.
10. Process simulated payout success, pending or failure events. Reconcile onchain status separately. Show accurate recovery-required states where applicable.
11. Display a receipt containing assumed quote amounts, fees, local order IDs, transaction hash, timestamps and the evidence type for each leg.

The displayed amounts should reconcile across the route. Do not hard-code a favorable FX rate as an executable provider quote. Any fixture rate must be labelled as a demo assumption.

## 4. What our application does

Proposed architecture: a web frontend, one backend, a database, local fiat simulators and a testnet integration module. The backend runs the real transfer state machine. Simulators act as replaceable funding and payout modules; no external money-provider credentials are required.

| Component | Responsibility |
| --- | --- |
| Frontend | Amount and synthetic recipient entry, quote review, simulated funding controls, progress and receipts. |
| Backend | Validate requests, create transfers, enforce allowed state changes, run simulator modules, call Fuji RPC and prevent duplicate operations. |
| Database | Persist quotes, transfer amounts, local order IDs, events, transaction hashes and reconciliation records. |
| Local fiat simulators | Generate explicit success, pending and failure outcomes for USD funding, conversion and THB payout. Never impersonate a provider response. |
| Testnet module | Send test USDC between dedicated demo wallets and verify confirmation without representing test assets as customer funds. |

The proposed production boundary puts receipt, custody, conversion and payout with appropriately authorized providers. Our exact legal role and any remaining licensing or compliance duties require review of actual contracts and operations. API use alone does not establish an exemption.

Someone must supply THB liquidity for the bank payout. Stablecoin settlement does not itself create baht in a recipient's bank account. Confirm whether liquidity comes from the provider, a local payout partner or platform prefunding, and who bears the cost and loss exposure.

## 5. Scope and acceptance conditions

Include one sender, one recipient, one direction, one simulated funding method, quote review, persisted status, receipts, an actual testnet settlement leg and observable failure handling. Use synthetic identities. Keep test-wallet signing credentials server-side.

Defer reverse-direction transfers, stored customer balances, multiple countries, batch payouts, a consumer crypto wallet, trading, a custom settlement smart contract and unrelated AI features. Production money movement is outside this hackathon prototype.

The prototype passes its technical acceptance check when:

- A complete transfer workflow can be repeated using the declared test systems.
- Refreshing the page preserves the transfer and its status.
- Duplicate submissions and simulated event deliveries cannot trigger duplicate settlements or payouts.
- Invalid or unauthorized simulator events cannot change transfer state.
- Funding failure prevents payout; payout failure produces an accurate recovery state.
- A testnet broadcast or receipt timeout remains pending/unknown until reconciled onchain; it must not cause a fresh duplicate transfer.
- Quote expiry has a defined outcome and any changed price needs sender review.
- The receipt distinguishes actual testnet evidence and local fiat simulation; it does not claim an external provider sandbox was exercised.
- Amounts and fees reconcile without floating-point rounding errors.

These conditions prove application and integration behavior. They do not prove production security, bank delivery, legal approval, savings or demand.

## 6. Research gates and conditions

| When | Question or evidence needed | Decision if unresolved |
| --- | --- | --- |
| Before selecting the demo purpose | Is this a personal transfer or payment for work? | Keep scope provisional; preserve the actual purpose in test data. |
| Before implementation relies on Fuji | Can we obtain test AVAX and test USDC and complete one token transfer? | Investigate the exact access/RPC failure. If blocked, disclose and agree a reduced simulated-settlement scope rather than inventing blockchain evidence. |
| Before finalizing the demo quote | Which FX rate, fees and arrival estimate are illustrative assumptions? | Label fixtures clearly and keep the all-in cost model separate from measured savings. |
| Before adding a fiat provider later | Can the account exercise the actual sender, recipient, purpose, funding and payout combination? | Keep local simulators; do not make provider signup a prerequisite for this demo. |
| Before offering real bank/card funding | Which methods permit the P2P purpose and geography, with what timing and return rules? | Do not substitute ordinary merchant checkout or imply unsupported funding. |
| Before selecting a production stablecoin/network | Which asset, chain and conversion path do approved counterparties support? | The Fuji demo does not answer production compatibility; verify separately and count conversion costs. |
| Before replacing simulated checks with production verification | What actual sender/recipient information and checks are required? | Revalidate the UI and contracts; synthetic demo fields do not prove production eligibility. |
| AI track | User now confirms that creating with AI tools is the track's purpose. | No in-product AI requirement remains in the current plan. |
| Before claiming savings | What does the same total USD sender spend yield as net THB, including every fee and spread? | Present a sourced scenario model and unknowns, not a verified cheaper-market claim. |
| Before claiming demand | Will real target senders accept the funding method, checks and timing? | Label adoption as unvalidated; team-only testing does not establish demand. |
| Before offering real-money service | What approved entities handle each money leg, and what is our contractual/legal role? | No production launch based solely on sandbox success or public coverage pages. |
| Before adding THB-to-USD | Are outbound Thai FX, stablecoin settlement and US payout arrangements approved for the actual purpose? | Keep reverse direction unavailable. Do not infer it from inbound support. |

Production review must cover Thai payment/FX requirements, applicable digital-asset rules, US federal/state requirements, customer eligibility, KYC/AML, sanctions, personal-data handling, custody and signing, complaints, refunds, chargebacks and reserves. Obtain partner-specific answers and qualified review for the actual model; this document is not a legal clearance.

TransFi's public agreement contains significant customer compliance and chargeback obligations and a minimum 90-day collection reserve clause. Clarify the terms applicable to the intended product before assuming immediate use of collected funds. Provider integration does not automatically outsource all responsibility.

## 7. Provider access reference for later integration

This section is retained as future research, not the next demo task. The user cannot use TransFi because signup requires a business email. Coinbase's server-side Secret API Key has been obtained, but session setup and fiat integration are deferred. Do not keep sending the user through signup flows before building the selected simulation-based prototype.

TransFi's current documentation describes self-service sandbox signup without KYB or a sales call. That is documentation evidence, not a completed signup or account-level corridor test.

1. Sign up through `https://displai.transfi.com/auth`. Obtain sandbox username, merchant password and MID under Settings > Integration. Keep them in local server-side environment variables, outside source control and chat.
2. Call `GET https://sandbox-api.transfi.com/v3/mids` with HTTP Basic authentication and the `mid` header. A response containing the account's MIDs establishes authentication only.
3. Fetch sender and recipient requirements for the intended US and Thai individual roles. Use the current API reference and validated responses. The sender quickstart uses `country` while its mandatory-fields reference lists `geo`; resolve this documentation mismatch before copying request payloads.
4. Query eligible USD collection and THB payout methods for the account. Confirm the asset, purpose code, required balance and supported conversion route. Do not assume an EUR IBAN example provides US USD bank funding.
5. Create a sandbox collection and simulate the documented funding event. Record order ID, request/response amounts and resulting available balance.
6. Create the THB sandbox payout using the provider's test recipient and balance rules. Confirm whether collection proceeds can fund it or separate sandbox prefunding is required.
7. Use the sandbox status simulation endpoint, `POST /v3/simulation/order`, and verify subsequent order state and authenticated webhook handling. Exercise success and failure separately.
8. Record exactly which legs passed. A functioning THB payout alone does not establish USD collection or the complete corridor. Independently prefunded tests do not establish a linked collection-to-payout balance flow.

If configuration or access is blocked, ask support:

> We are building a hackathon sandbox for US individuals sending USD by bank funding to Thai individuals receiving THB in bank accounts. Can our sandbox MID exercise collection and payout for this P2P use case? Which funding methods, stablecoins, test fixtures, balance rules and simulation steps should we use? We are requesting test access, not production activation.

Do not send this message externally without user authorization. Ask separately about production permission, contracting and pricing when that stage is relevant.

## 8. Current demo boundary and future upgrades

1. **Selected now:** local USD funding and THB payout simulators, a real backend/database, and an actual Fuji test-USDC transfer. This is a functioning technical proof of concept with simulated fiat rails.
2. **Future upgrade:** replace an individual simulator module with an eligible provider sandbox integration. Preserve the transfer state machine and identify which legs now have provider evidence.
3. **Testnet outage fallback:** use a clearly labelled recording or replay of a previously verified transfer. If no transfer ever worked, label settlement as simulated and disclose the reduced proof. Never present a replay as a new live transaction.

Generic Stripe Checkout is not the assumed P2P fallback: Stripe explicitly lists peer-to-peer money transmission as prohibited. A successful merchant test payment would not establish eligibility for this use case.

Stables is a possible THB payout fallback to investigate. Its Thai product describes USDt settlement and links a sandbox. It does not, by itself, establish the required USD collection leg, USDC compatibility or approval for this team.

## 9. AI, naming and economics

The user confirms that AI-assisted development is the AI track's purpose. Build using AI tools; no chatbot, LLM API or AI payment decision feature is needed. The earlier multilingual field-extraction idea is deferred and outside the current scope.

The project name remains open. Do not spend integration time on naming. Once the user gives a preferred style or reference brands, offer a small new shortlist and check availability before committing.

For costs, compare equal total sender spend and final THB bank proceeds for the same purpose, funding method and timing. Include funding, FX spread, stablecoin acquisition/conversion, network, payout, provider/API minimums, KYC, platform fees and reasonable fraud/reserve assumptions. Separate bank-funded and card-funded scenarios. Show favorable, base and unfavorable cases and break-even costs. A subsidized sandbox price is not production economics.

Potential copying does not validate demand or establish defensibility. Partner access, distribution, trust and repeat use are business hypotheses to test after the first technical gate.

## 10. Next actions in order

1. Keep the current one-direction P2P slice and confirmed simulated-fiat boundary. Do not reopen provider signup or add the reverse direction.
2. Confirm the actual submission deadline and available builders before scheduling. AI-track purpose is now clarified; do not keep it as an unresolved gate.
3. Verify one Fuji test-USDC transfer, access to test gas and token balances, and the intended database access. These are the remaining infrastructure checks, not completed work.
4. Write and review the implementation-ready specification: UI flow, simulated event contract, transfer states, quote assumptions, amount accounting, duplicate protection, signing/broadcast reconciliation, recovery and acceptance scenarios.
5. Create the implementation plan after the specification is reviewed. This documentation update does not itself begin product implementation or deployment.
6. Build one complete path and deploy the web application to Vercel with durable database storage. Test happy path, funding failure, payout failure, refresh, duplicate events and uncertain chain status.
7. Prepare the cost hypothesis and pitch around observed results. Save a labelled backup recording for judging. Production partner access, legal clearance, pricing and customer demand remain future validation work.

Suggested pitch boundary:

> We are building a USD-to-THB transfer proof of concept. USD funding and THB bank payout are locally simulated; the settlement leg transfers test USDC on Avalanche Fuji. The application demonstrates tracking, receipts and failure handling. Production launch depends on approved partners, legal review and viable pricing. Savings and demand remain hypotheses.

Use completed-tense claims only after the corresponding code and transaction have been verified. At this update, the repository still contains planning documents rather than a working application.

## 11. Recommended technology stack and deployment

The demo scope is stable enough to write the detailed implementation specification. The following is the recommended stack, not software already installed or deployed.

| Layer | Recommended choice | Why it is included |
| --- | --- | --- |
| Web UI | Next.js App Router, React, TypeScript and Tailwind CSS | One web application for the sender flow, status and receipt; TypeScript also covers backend logic. |
| Backend | Next.js Route Handlers using the Node.js runtime | Quote creation, simulated fiat events, transfer state transitions and testnet RPC access in the same project. No separate Express/FastAPI service is required. |
| Durable data | Supabase Postgres | Quotes, transfers, events and transaction hashes survive refreshes and serverless restarts. Do not use in-memory state or a local SQLite file as deployed durable storage. |
| Blockchain client | viem | Read balances, call the existing token contract and verify transaction receipts/events. |
| Test network | Avalanche Fuji C-Chain, chain ID `43113` | Exercise the stablecoin settlement leg using test assets. |
| Test asset | Circle test USDC on Fuji | Use the existing token contract; no custom token or settlement smart contract is needed. Confirm the address against Circle's current official list before implementation. |
| Hosting | Vercel | Host the Next.js frontend and backend. Supabase hosts the database; Fuji executes the test-token transfer. |

Vercel and blockchain serve different layers. Deploy the website/backend to Vercel and submit settlement transactions to Fuji. The browser UI, synthetic bank details, quote model and database do not belong onchain.

Use two dedicated demo settlement wallets, funded only with test assets. Keep the signing key in server-only environment variables. Users should not need MetaMask, a wallet connection or their own gas to exercise the sender flow. Confirm chain ID, allowlisted token and destination, and bounded demo amounts on the backend before signing.

Use short backend requests, persisted state and status polling rather than a background timer that assumes a Vercel process stays alive. Record the intended onchain transaction before broadcast and reconcile its hash/nonce after uncertain outcomes; do not send a fresh transfer blindly. The detailed spec must define this recovery behavior and concurrency protection for the signing account.

Start with direct Supabase database access from the backend and the minimum UI components needed. Do not add an ORM, Redis, queues, wallet SDK, custom smart contract or AI API unless an observed requirement justifies it. The exact schema and signing-recovery implementation belong in the next specification.

Technical references: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Supabase Postgres](https://supabase.com/docs/guides/database/overview), [viem contract writes](https://viem.sh/docs/contract/writeContract), [Avalanche C-Chain RPC](https://build.avax.network/docs/rpcs/c-chain) and [Circle USDC contract addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses).

## 12. Sponsor use and track choice

Latest user steering: the sponsor bonus is worth 5%, and sponsor points are available in the AI track. The user is home at night and can contact organizers tomorrow. U-bot development use might count, but that detail remains unconfirmed. Do not reopen AI-track sponsor eligibility as an unresolved question.

Tentative policy, not a commitment to extra features: protect the core demo and leave small addition points for sponsor tools. Keep Avalanche settlement as the existing technical-proof target. Use U-bot during development if accessible, retaining useful output and session evidence. Defer Tokenomist and ElevenLabs runtime features until the complete core flow passes its acceptance checks and enough time remains to integrate and retest. Optional analytics or voice requests must never block quotes, settlement, status or receipts. Do not build a generic plugin framework or extra infrastructure merely to reserve room.

Tonight's work should not depend on organizer replies: finish the core specification and demo path in AI track. Tomorrow, confirm whether development-only U-bot use counts and what evidence earns the reported bonus. Reassess optional additions after that answer and the core-demo check. No track switch is needed to pursue the sponsor bonus.

The user clarifies that using or integrating sponsors' products earns extra points and explicitly wants to maximize sponsor participation. Sponsor use is therefore a project objective even where the payment engine does not require the tool. The resource sheet's lack of a mandatory-use statement must not be interpreted as a reason to ignore sponsor points.

The user reports a 5% bonus and confirms AI-track eligibility. Per-sponsor accumulation, evidence requirements and whether development use counts have not been verified in the inspected material. Preserve these distinctions. Sponsor logos alone are not evidence that a tool was used.

| Priority | Sponsor | Proposed use | Evidence and remaining condition |
| --- | --- | --- | --- |
| 1 | Avalanche | Execute the Fuji test-USDC settlement and show the transaction receipt and explorer reference. | Save the actual transaction hash and demonstrate the integration. Confirm whether Fuji/testnet use earns the announced partner points. |
| 2 | U-bot | Use U-Code to build/preview a UI component or prototype, and Professional mode to help produce test scenarios or project material. | The supplied guide confirms these modes and requires the hackathon-registration email. Save the session and resulting artifact. Code export and an embedding API are not established by the guide. Confirm development-use evidence requirements. |
| 3 | Tokenomist | Add a small read-only network-token context panel, using actual AVAX supply/emission/unlock data if the grant covers it. Alternatively use the API/CLI for documented treasury research if that usage qualifies. | The sheet says the team leader's email is used to sign up for an API grant. Inspect granted endpoints and AVAX coverage first. Tokenomics data is context, not an FX rate, gas-price quote, proof of stablecoin safety or payment-routing decision. |
| 4 | ElevenLabs | Optional user-triggered spoken receipt in Thai/English, generated from the application's saved demo amounts and status. | Use synthetic recipient data and accurately say that THB payout is simulated. Verify credit access and voice/API support before committing. Add after the complete payment demo works. |

These are proposed additions, not implemented features or verified points awards. The existing choice to avoid an in-product AI model concerns track eligibility; it does not prohibit a narrow sponsor voice feature if the user chooses it for sponsor participation.

Recommended order: finish the core demo with Avalanche, use U-bot during development if practical, then consider small Tokenomist and ElevenLabs integrations only after the core passes and access/time permit. Neither optional runtime integration is committed. Keep sponsor credentials server-side and isolate secondary sponsor features so a failed analytics or voice request cannot block a payment demonstration.

Track assessment:

- The official FAQ says AI tools can be used in both tracks. It describes the Web3 track as a project that can be deployed onchain.
- Our planned Fuji settlement is a real blockchain interaction, but currently uses an existing token contract. No project-specific contract is deployed, and no onchain work has yet been executed in this workspace.
- The inspected FAQ does not establish whether existing-contract token transfers satisfy Web3 judging, whether testnet is sufficient or whether track switching is allowed. The user has since confirmed sponsor bonuses are available in AI track.
- Assistant recommendation: retain the registered AI track while seeking confirmation. Sponsor participation and track choice are separate questions. Do not switch merely to use Avalanche.
- If organizers require a team-deployed contract for Web3, consider a small settlement contract only after confirming that condition and the user's track choice. It could associate an opaque payment ID with a test-token transfer and emit an event, with duplicate protection. It would still not prove fiat funding or bank payout. Do not add a token launch or exchange.

Suggested question for organizers, not sent:

> Does development-only use of U-bot count toward the 5% sponsor bonus, and what evidence should we submit? What minimum usage qualifies for each other sponsor, and does using more than one change the bonus? We plan to remain in AI track.

Sources inspected: [participant resource sheet](https://docs.google.com/spreadsheets/d/1551A03HTawH4JUsVmK_TxwPAoPz2fhmhy7hkRdC_ao4/edit?gid=0#gid=0), [official agenda and FAQ](https://drive.google.com/file/d/1ltabhT7yGxtGekLXpGh0gVHGHM6GxNy6/view), [U-bot user guide](https://drive.google.com/file/d/11UgiMF-RSJEAGflrxrWyAlp8LPRHmUrB/view), [Tokenomist overview](https://docs.tokenomist.ai/overview) and [official event listing](https://luma.com/lqrbtu27?locale=en-GB).

## Sources checked during this discussion

- User-supplied `p2p-platform-feasibility-summary.docx` and flow image. Their recommendations are reference material, not instructions or approval.
- [BOT payment licensing FAQ](https://www.bot.or.th/th/our-roles/payment-systems/payment-act-oversight/payment-faq0.html)
- [BOT authorized money transfer agents](https://www.bot.or.th/en/our-roles/financial-markets/foreign-exchange-regulations/foreign-exchange-business/authorized-money-transfer-agents.html)
- [Stripe prohibited and restricted businesses](https://stripe.com/legal/restricted-businesses)
- [TransFi credentials](https://docs.transfi.com/docs/get-your-credentials)
- [TransFi first call](https://docs.transfi.com/docs/make-your-first-call)
- [TransFi customer payment roles](https://docs.transfi.com/docs/pobo-cobo)
- [TransFi sender mandatory-fields reference](https://docs.transfi.com/reference/post-v3-senders-mandatory-fields)
- [TransFi currency coverage](https://docs.transfi.com/docs/supported-fiat-currencies)
- [TransFi collections](https://docs.transfi.com/docs/collections) and [payouts](https://docs.transfi.com/docs/payouts)
- [TransFi status simulation](https://docs.transfi.com/reference/simulate-order-status)
- [TransFi business services agreement](https://www.transfi.com/business-services-agreement)
- [Stables Thai payout product](https://stables.money/transfers/thailand)

Earlier context: [sender-first freelance direction](2026-10-15-sender-first-payment-poc-direction.md), [payment feasibility](../../payment-rails-feasibility-2026-10-15.md), [cost checks](../../cost-check.md) and [session handoff](2026-10-15-session-handoff.md). The generic card fallback in earlier documents must not override the P2P restriction above.
