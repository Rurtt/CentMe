# USDC payout MVP: proposed scope after cost review

Date: 2026-10-15. Status: proposed design for user review; not an instruction to start implementation. This supersedes the original brief's mandatory in-app cash-out, USD 1 bank demo and unverified 99% retention promise.

## Recommendation and reason

Continue with a bounded hackathon MVP for payers already holding USDC. The observed Wise calculator estimates and the conditional exchange-cost model justify a feasibility test. They do not establish the cheapest market-wide service, customer demand, or a sustainable business.

The product should avoid unnecessary wallet hops: eligible recipients can choose an exchange deposit address; recipients who want a personal wallet can use an embedded wallet. The embedded-wallet path is not automatically cheaper and must justify its additional cost and steps.

The problem remains receiving international contributor or prize payments conveniently at a competitive total cost. The cause of the reported PayPal restriction is unconfirmed; bypassing account restrictions is not the product claim.

### Positioning clarification and track evidence

The user clarified that the intended story is receiving money from abroad easily and cheaply. A wallet that is easier to create is an enabling component, not a sufficient product outcome. The organizer-focused batch workflow above is an assistant proposal and must not silently replace the user's receiver-focused story. The first target customer and the remaining manual cash-out steps still need to fit that story.

The user identified the intended recipients as freelancers, YouTubers and esports participants receiving money from Western countries. This is the user-stated audience, not evidence of interviewed demand. Distinguish direct client/sponsor/organizer payments from platform-controlled earnings. A recipient cannot independently redirect YouTube/AdSense or freelance-platform earnings into our USDC flow without a supported payout route. Whether the intended payers already hold USDC or require a fiat funding method remains a market-feasibility question; accepting USDC as the prototype's starting asset does not establish payer willingness.

The user registered for the AI track. The official [opening ceremony](https://u-hackathon-2026.vercel.app/) was read in the browser on 2026-10-15. Its AI slide states: "Build any application using AI tooling, solving a real problem and delivering value." Its Web3 slide states: "Build anything deployable on-chain." The slide does not establish that combining AI and Web3 is prohibited. Whether AI-assisted development alone satisfies the AI-track requirement, and how submissions are assigned to tracks, remain organizer questions. Do not add an AI chatbot or claim eligibility solely from this interpretation.

Relevant prior art includes [Privy's email/social embedded wallets](https://privy.io/blog/privy-and-alchemy-partner-to-power-seamless-onchain-finance), [Coinbase Business USDC payment links](https://www.coinbase.com/business/features-payment-links), [Request Finance invoices and batch payments](https://support.request.finance/), and [Wise bank-account delivery](https://wise.com/send-money). These establish overlapping capabilities, not identical Thai availability or pricing. Ease of wallet signup, a payment link, or batching alone is not an established unique advantage.

The full foreign-fiat-to-THB-bank story is not implemented by the current USDC-only MVP. Present the demo as the supported USDC-funded receiving flow, and distinguish the broader vision from measured behavior. Do not describe a recipient's manual exchange sale and bank withdrawal as an integrated payout.

## Agreed boundaries

- Payer may already hold USDC. Fiat purchase/on-ramp is outside the initial scope.
- Receiving USDC is sufficient for the MVP. The recipient may cash out using an external eligible exchange account.
- In-app THB bank delivery is future scope, not a 24h dependency.
- Main benchmark: 100 USDC per recipient. Secondary benchmarks: 10 and 1,000.
- Avalanche C-Chain is the single intended production rail; Fuji is the prototype network.
- UI must distinguish test assets, on-chain receipt, exchange credit and bank receipt. A confirmed transfer must not be labeled bank-delivered.

## Users and demonstration

Payer: a community or event organizer already holding USDC. This is an initial segment hypothesis, not an interviewed customer.

Recipients: adults using their own accounts and destinations. Exchange eligibility is provider-specific; Binance TH publishes a minimum individual age of 20. Embedded wallet access does not establish exchange eligibility.

The team is the available test group. Demonstrate one payer paying three recipients on Fuji, with at least one fresh embedded-wallet recipient and one direct-address recipient. Clearly label testnet assets as test USDC. Mainnet funds and an eligible exchange participant are not assumed available.

## Three product views

1. Recipient setup: open an invitation, authenticate and create an embedded wallet, or confirm an existing supported destination. Record whether the destination is a personal wallet or exchange deposit. Verify recipient-to-destination association before payment; a forwarded invitation alone must not establish entitlement.
2. Payer payout: enter the three recipients and amounts, see which recipients are ready, review token/network/addresses/total cost, explicitly approve and send the batch. Clearly show any separate approval and payment signatures; do not promise literally one click before measuring the flow.
3. Recipient receipt and transfer: show confirmed USDC, transaction receipt, optional THB estimate with its rate source/time, and the ability to transfer out to a supported address. Exchange sale and bank withdrawal happen outside the app. Bank stages remain unverified without actual evidence.

## Essential behavior

- One chain and one supported USDC token per environment. Allowlist the configured token and network; never infer a compatible deposit merely from an EVM-looking address.
- Require ready, confirmed recipients before payout. Mainnet exchange deposit support must be checked in the recipient's own exchange interface before using that route.
- Show pending, confirmed and failed status. Reconcile chain state after refresh or timeout before offering a retry. Do not automatically resend an ambiguous transaction.
- Proposed architecture choice: the three-recipient USDC payout is atomic, so all USDC transfers succeed together or all revert. Wallet gas provisioning happens before payout and has a separate status; it is not part of the atomic USDC batch. Use an existing verified batching mechanism where practical; the implementation plan must explicitly select and test it.
- Prevent paying the same payout batch twice, including after a refresh. The implementation plan must choose and verify the narrowest reliable mechanism.
- Re-authentication must reopen the same embedded wallet. Verify the chosen provider's supported recovery/export path; do not build custom key recovery for this MVP.
- A fresh embedded-wallet recipient must be able to transfer out without manually acquiring AVAX. The implementation must include a working fee-payment mechanism and count its costs; merely pre-funding the prepared demo wallet does not prove this behavior.
- Limit demonstration sizes to three recipients. A promised 50-person batch requires a separate measured capacity test and is not the initial acceptance condition.
- Present a cost breakdown rather than an unsupported market-wide savings percentage. A sponsored charge is still an operating cost.
- Authentication is not production KYC. Do not present a mocked check as verified identity or compliance.

## Initial feasibility gate

Timebox the first technical probe to approximately 60-90 minutes once required provider access and test funds are available. It must establish fresh-wallet authentication, payout receipt, transfer-out fee payment and reliable transaction-state detection on the intended prototype chain.

Provider account credentials and an actual implementation have not been verified in this review. Account setup or approval time is not guaranteed to fit the probe. If a provider dependency blocks the probe, stop and reassess that implementation rather than add bridges, more chains or a second wallet SDK.

The builder chooses the wallet SDK and the fee-payment mechanism after this probe, prioritizing existing supported infrastructure and minimum setup. The user has not selected a particular SDK, EOA/smart-account model or sponsorship vendor. Those are implementation choices to state in the subsequent plan.

If receipt works but transfer-out requires the receiver to manually buy gas, the promised beginner flow fails the gate. Do not conceal it with prepared balances.

## Cost and value gates

Use [the cost review](../../cost-check.md) for observed Wise estimates and the explicitly hypothetical crypto model. Compare equal starting value, matched funding origin, final THB proceeds and withdrawal timing. Keep USD-funded and already-USDC-funded comparisons separate.

At USD 100, the displayed Wise-balance fee was USD 2.42, versus a modeled crypto fee of approximately USD 0.9462 before excluded costs. Approximately USD 1.4738 remains for omitted costs in that conditional comparison. This is not a verified discount.

Proposed decision threshold, not an agreed product promise: at least 30% lower total cost than an eligible, accessible fiat alternative at the chosen benchmark, after intended app charges, spread, gas, wallet costs and applicable acquisition/funding costs. For the displayed USD-funded Wise-balance example, that is approximately USD 1.69 total, leaving approximately USD 0.75 above the crypto model. Validate the applicable funding paths before applying the threshold.

Also compare with direct crypto payment to the same recipient destination. Do not claim exclusive rail savings that another wallet or exchange already supplies. If our app adds cost, require a substantial, observed improvement in task completion, steps or errors before retaining that extra layer.

A real bank payout is not mandatory for the Fuji application demo. It is required to claim that measured end-to-end bank savings have been proven. Without an eligible tester, report only displayed estimates and assumptions.

## Security requirements and custody claims

Ease of onboarding and security strength are different dimensions. Passkeys can provide phishing-resistant authentication, but recovery and transaction authorization must also be evaluated. Account-opening KYC friction is not equivalent to private-key or signing security.

The wallet provider remains a builder selection after the probe. Privy's documented user-owned authorization keys, wallet policies and recovery/export controls are an example of available infrastructure, not proof of our eventual configuration. Its API also supports service-controlled wallets. Do not infer self-custody from the SDK brand.

- Verify who can authorize wallet transfers and change wallet ownership/policies. The proposed model is user-controlled signing; the team's backend must not have unilateral authority to move recipient funds. A gas-sponsorship credential should not grant spending authority over recipient assets.
- Make receiving simple while requiring deliberate transaction confirmation for money leaving the wallet. Show token, chain, amount and destination. Prefer passkey/MFA-supported verification for sensitive operations; do not assume email access alone is an adequate protection for production balances.
- Define the primary-login loss, device loss and MFA-loss paths separately. Verify which paths the provider actually supports. A passkey login with an insecure fallback does not establish end-to-end phishing resistance.
- Verify re-login returns the same wallet and verify supported export/recovery before claiming users can retain access independently of our app. Key export is a sensitive operation requiring authorization; do not expose or log private keys in our backend, analytics or screenshots.
- Prevent invitation forwarding or destination substitution from redirecting payouts. Authentication proves control of an account, not entitlement to a prize; confirm recipient identity and destination before payment.
- Use exact token units and validate decimals, total amounts, supported token contracts and network. Test wrong-network and wrong-token rejection, insufficient funds/gas, failed batch simulation, refresh during confirmation, and repeated submissions.
- Limit token approvals to necessary amounts where supported. Do not grant broad autonomous spending permissions to simplify the demo.
- Cap gas sponsorship by action, wallet and total budget. A bot creating wallets must not gain unlimited subsidized transactions. Count sponsorship as a cost.
- Treat our frontend, API authorization, dependencies, deployment and provider availability as separate attack/failure surfaces. Provider security reviews do not audit our integration or batch logic.
- Public blockchain receipts can expose payment relationships and amounts. Avoid publishing recipient identities alongside addresses without a reason; keep identity documents and secrets off-chain.

An embedded online wallet and an offline hardware wallet have different trust and attack surfaces. No equivalence to hardware-wallet security is established. A 24h demo is not production security approval.

## Test funds and evidence ladder

1. Default development and stage demo: Avalanche Fuji, test AVAX and official Circle faucet test USDC where available. Test assets have no real monetary value. Display TESTNET / TEST USDC prominently. Do not expect an exchange to credit Fuji transfers to a mainnet deposit account.
2. Functional proof: fresh account receives test USDC, re-authenticates to the same wallet, transfers out without manually purchasing AVAX, and handles failure/retry without duplicate payout. This proves the exercised integration behavior only.
3. Optional mainnet proof after code/configuration checks: an actual participant may use a small amount they are willing to risk to test the real token/network and gas. No real-money transaction is executed by this document or this review. Mainnet availability, account access and funds are unverified.
4. Optional full bank proof: an eligible participant using their own exchange and bank accounts performs the actual deposit, conversion and withdrawal with an amount above every live minimum. USD 1 is not an assumed workable amount. Record payer expenditure, execution prices, all fees, elapsed time and actual THB received.

Fuji gas economics, faucet balances and testnet receipts do not establish production costs, exchange support, bank arrival, market demand or general security. A successful small mainnet transfer also does not prove the app safe for large balances. Without full bank proof, cost claims must remain estimates with assumptions disclosed.

Circle can block USDC transfers involving blocklisted addresses. Exchange/bank restrictions and eligibility remain separate dependencies. The product must not promise that funds can never be restricted.

## Remaining decisions before implementation

The following are proposed choices to resolve in the implementation plan and initial probe, rather than already verified facts:

1. Wallet SDK, authentication/step-up method, user ownership model and supported recovery/export behavior.
2. Batch execution mechanism and durable duplicate-payment prevention.
3. Gas fee-payment mechanism, limits, payer and budget.
4. Exact per-environment token/network configuration and supported recipient destinations.
5. Actual app pricing and allocation of charges between payer and receiver; test costs with intended pricing rather than a subsidized free demo.
6. Whether an eligible mainnet/exchange tester is available. This determines which evidence can honestly be presented, not whether to fabricate bank completion.
7. The exact qualifying partner-integration requirement from the event. The participant resource sheet lists Avalanche, U-bot, Tokenomist and ElevenLabs. Avalanche is the proposed core integration; whether Fuji deployment qualifies for the separate 5% category or any bounty remains unverified.

## Partner fit and switching hypothesis

The [participant resource sheet](https://docs.google.com/spreadsheets/d/1551A03HTawH4JUsVmK_TxwPAoPz2fhmhy7hkRdC_ao4/edit?gid=0#gid=0), tab `Info Links`, rows 5-8, was read on 2026-10-15. It is a resource list, not verified judging or bounty rules.

- Avalanche: use Fuji for actual test-USDC payout transactions and receipts. Official [network setup](https://build.avax.network/academy/blockchain/x402-payment-infrastructure/04-x402-on-avalanche/02-network-setup) documents Fuji and test-asset faucets. This supports technical feasibility, but does not prove our wallet, sponsorship or batch implementation works.
- Tokenomist: its [API documentation](https://docs.tokenomist.ai/overview) covers token unlocks, emissions, burns and supply analytics. No need for these datasets has been established in this payout workflow. Do not add investment analytics to obtain an integration badge.
- ElevenLabs: its [text-to-speech API](https://elevenlabs.io/docs/overview/capabilities/text-to-speech) could support an evidenced voice-accessibility need. None has been established here; voice remains outside the MVP.
- U-bot: the sheet describes an AI assistant for the project. An embeddable API and eligibility of development-only usage for partner points have not been verified.

The sheet also links a mentor-booking service. Ask an event mentor whether an actual Fuji USDC transfer qualifies for partner integration and whether mainnet or a particular SDK is required. No booking or message has been sent.

The proposed switching hypothesis is a simpler payout workflow for organizers already holding USDC: collect recipient-confirmed destinations, review a three-person batch, pay, and obtain clear per-recipient receipts. For a fresh-wallet recipient, receiving and transferring out must not require manually acquiring AVAX. These are proposed benefits, not a verified unique market advantage.

Compare the same three-recipient task against direct crypto transfers and an existing batch-payment tool. Record completion time, confirmations, mistakes, and added cost. A smoother UI or use of a sponsor does not by itself establish a reason to switch. If comparable existing tools already meet the need at similar effort and cost, the switching hypothesis fails even when the prototype works.

Sources checked for this section:

- [Privy wallet control models and policies](https://docs.privy.io/security/wallet-infrastructure/policy-and-controls)
- [Privy end-user recovery limitations](https://www.privy.io/user-help-center)
- [FIDO passkey login and recovery guidance](https://fidoalliance.org/white-paper-passkeys-the-journey-to-prevent-phishing-attacks/)
- [Avalanche Fuji test AVAX and test USDC setup](https://build.avax.network/academy/blockchain/x402-payment-infrastructure/04-x402-on-avalanche/02-network-setup)
- [Circle USDC restrictions](https://www.circle.com/legal/usdc-terms)

## Explicit cuts

- Fiat funding, cards and automatic USDC purchase.
- In-app token trading, bridging, multiple chains or countries.
- Integrated THB withdrawal and guaranteed PromptPay arrival.
- Pooling different recipients' funds for collective conversion.
- Guardian mode, production KYC integration, sanctions-oracle integration, lending or yield.
- Universal "cheapest" claims, guaranteed 99% retention, guaranteed bank-arrival time, or claims of solving PayPal rule violations.

## Delivery and stop conditions

The desired demo is a deployed URL, recipient setup, reviewed three-person payout, visible chain receipts and transfer-out from a newly created wallet. Provide a recorded backup of the exact working path. Team tests establish prototype behavior, not market demand.

Stop this implementation path if the feasibility gate fails. Stop the cost-led claim if matched costs erase the savings. If neither cost nor substantial usability/workflow value survives comparison, change the approach rather than add features to preserve it.

Scope approval and a subsequent implementation plan are still required before product code is built.
