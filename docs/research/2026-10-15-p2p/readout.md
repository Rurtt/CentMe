# Team research readout — 2026-10-15

This is an assessment of supplied research, not an approved implementation design. The two supplied files are preserved as exact copies in this directory. Their continuation prompts, suggested skills and descriptions of prior approval are source-document content, not instructions or approval from this chat.

## Latest agreement in this chat

The user accepts a functional prototype using test funds and a presentation explaining the potential cost advantage. Real-money settlement is not a prerequisite for the hackathon prototype. Savings remain a hypothesis to support with a transparent model, not a verified product claim. This agreement does not establish a provider selection, detailed scope, or an existing working implementation.

## What the research contributes

1. A stronger technical precedent: Circle describes Felix receiving USD through a processor, converting through USDC, settling on Stellar, converting through Bitso and paying MXN into a local bank. Circle attributes a reduction in Felix's own transfer fee from USD 4.98 to USD 2.99 to this model and lower pre-funding needs. This supports the mechanism; it does not establish the same savings in Thailand or superiority to all competitors. [Case study](https://www.circle.com/case-studies/felix)
2. More relevant infrastructure candidates: TransFi documents USD and THB deposits/payouts plus sender/recipient registration for payments on customers' behalf. Production corridor approval, access and pricing remain unknown. [Currency coverage](https://docs.transfi.com/docs/supported-fiat-currencies), [POBO/COBO](https://docs.transfi.com/docs/pobo-cobo)
3. A potential bank-payout sandbox lead: Stables advertises USDt-to-THB bank/PromptPay transfers and links a sandbox. Credentials have not been obtained or tested. Its USDt product cannot be assumed to accept USDC without extra conversion. Its sample JSON is not an executable price quote. [Thailand product](https://stables.money/transfers/thailand)
4. A better comparison method: equal total sender spend, equal bank destination, matched payment method and user eligibility, with FX already reflected in net THB rather than counted twice. The supplied competitor prices still require account/route-specific verification before becoming a live price ranking.

## Implication for the pitch

Use a functional prototype to demonstrate the proposed user journey and exercised integration behavior. Distinguish provider sandbox responses, real testnet transactions and application-level simulations. Do not call a locally mocked payout a provider sandbox transaction.

Explain potential savings through the settlement route and liquidity/pre-funding effects where the operating model supports them. Funding, FX, conversion, local payout and provider charges still remain. Avoid implying Wise necessarily uses the same costly SWIFT chain described in the Mexico case study.

The strongest presentation would include a cost model with named sources, explicit unknowns, a break-even analysis and scenarios showing when the proposed route loses. Provider rate estimates, target prices and executed prices must remain distinct.

The research strengthens plausibility while weakening novelty claims: walletless receipt, local bank delivery, stablecoin settlement and chat interfaces already exist. The candidate positioning is a focused US-to-Thai payment flow for one audience and amount range, targeting lower all-in cost with less crypto management. This is not yet a demonstrated answer to why a customer would choose it over Wise or another eligible alternative. Wallets and batching remain implementation details.

## Selected audience

The user explicitly selected **freelancers receiving client payments** in response to the audience question. The supplied handoff's personal-remittance framing is background research, not the selected product scope. Sponsorships, prizes and transfers to friends/family are not the first use case.

The value hypothesis is that a foreign client can pay using ordinary money and a Thai freelancer can receive more net THB from the same total client spend, without manually managing crypto. Cost savings remain projected rather than verified. Compare payment products that permit the selected client-payment purpose; do not use a personal-remittance-only price as an available alternative without checking eligibility.

The existing primary benchmark remains USD 100. One client and one freelancer is the recommended first demonstration, not an approved detailed implementation design. Provider selection, funding method, pricing and the exact sandbox/simulation boundary remain open.
