# Cost gate: USDC payouts to Thailand

Discussion update: 2026-10-15. This records current assumptions; it does not lock a new implementation plan.

## Agreed scope

- The initial payer may already hold USDC.
- Benchmark payout size: 100 USDC per recipient.
- Easy receipt of USDC is sufficient for the MVP. Recipients may cash out through an external exchange.
- In-app THB cash-out is optional future scope.
- The user prioritizes a meaningful cost advantage or a substantial usability advantage over accessible alternatives. Generic crypto onboarding alone does not establish the UVP.
- The cause of the reported PayPal withdrawal problem remains unconfirmed. Do not present it as a proven failure that this product fixes.

## What is and is not established

Embedded wallet infrastructure exists. No product prototype, measured usability advantage, actual cash-out, or complete competitor cost comparison has been verified in this review.

The earlier brief's "keep ~99%" claim is unproven. Treat it as a hypothesis, not a product promise.

## Illustrative cost calculation

These are hypothetical execution prices, not live quotes: 1 USDC = 1 USDT and 1 USDT = THB 35. Assume the available conversion route is USDC to USDT to THB, with ordinary published Binance TH fees: 0.10% for crypto pairs, 0.25% for THB pairs, and THB 20 for the ordinary bank withdrawal.

| Item | Amount |
| --- | ---: |
| Reference value of 100 USDC | THB 3,500.00 |
| Bank proceeds after those two trades and withdrawal | THB 3,467.76 |
| Modeled fees | THB 32.24, approximately 0.92% |

Calculation: `100 * 0.999 * 35 * 0.9975 - 20`.

This excludes blockchain gas, app fees, wallet infrastructure charges, screening costs, market spread, slippage, and any additional bank charges. Actual pair availability, account eligibility, deposit crediting and execution prices still require verification. If the payer starts from fiat in a later version, include USDC acquisition costs as well.

At these illustrative prices, a 1% total-cost ceiling leaves only approximately THB 2.76 for all remaining costs. A hypothetical additional app charge of 0.50 USDC would raise the modeled total to approximately 1.42%, before the remaining excluded costs.

## Required baselines

1. Direct USDC transfer to the recipient's eligible exchange account, followed by the same conversion and bank withdrawal.
2. Our proposed wallet flow, followed by the same conversion and bank withdrawal. Count sponsored gas as a cost even if recipients do not pay it directly.
3. An eligible fiat payout alternative such as Wise, including the payer's USDC-to-fiat conversion and funding costs when starting from the same USDC holdings.
4. The applicable PayPal product and account-specific rates, with the same starting value and bank endpoint. Do not substitute commercial merchant fees for a payout product without checking applicability.

Use the same funding asset, payout size, recipient destination, time and reference valuation. Record payer cost and recipient net proceeds separately. A wallet receipt is not comparable to a competitor's completed bank payout.

No executed comparison for a 100-USDC starting scenario was obtained. The public PayPal Thailand fee page explicitly warns that some listed rates may not apply to accounts opened with PayPal (Thailand) Limited. Do not use that page to establish an applicable current PayPal price without checking the account and payment product.

## Live Wise calculator check: 2026-10-15

The official US-to-Thailand page was inspected interactively. Source currency was USD and target currency was THB. The displayed fees are included in the entered USD amount. The user's USD 2.18 and USD 2.87 examples match the calculator's ACH/direct-debit estimates. The page also names lower prices when funding from an existing Wise balance.

| Entered USD | ACH fee | ACH fee / entered amount | Wise balance fee | Wise balance fee / entered amount | THB received via ACH |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 2.18 | 21.80% | 1.89 | 18.90% | 262.22 |
| 100 | 2.87 | 2.87% | 2.42 | 2.42% | 3,257.01 |
| 1,000 | 9.65 | 0.965% | 7.70 | 0.770% | 33,208.91 |

Displayed reference FX: USD 1 = THB 33.5325. These are observed calculator estimates, not completed payments. The Wise balance estimates assume an already funded balance; include applicable funding costs when relevant. Do not extrapolate a universal Wise fee formula from these three points. Other providers' numbers shown in Wise's comparison widget are not independently verified quotes and are excluded from the ranking.

## Crypto sensitivity model at the same reference valuation

For this model only, assume USDC/USDT = 1 and execution of USDT/THB at the same THB 33.5325 reference. This is NOT a live exchange quote. Keep the published ordinary trade fees and THB 20 withdrawal fee above.

`modeled fee in USD-equivalent = amount * (1 - 0.999 * 0.9975) + 20 / 33.5325`

| USDC amount | Modeled fee before excluded costs, USD-equivalent | Modeled percentage | Additional-cost budget before reaching the displayed Wise balance fee |
| ---: | ---: | ---: | ---: |
| 10 | 0.6314 | 6.314% | 1.2586 |
| 100 | 0.9462 | 0.946% | 1.4738 |
| 1,000 | 4.0939 | 0.409% | 3.6061 |

The budget is conditional arithmetic, not proven savings. It must cover all omitted costs: gas, wallet SDK charges, app charge, spread, slippage and any acquisition/funding costs needed for a fiat-funded comparison. In a USDC-funded comparison, add the conversion and funding needed for the Wise route instead. Compare final net THB at matched total payer spend before declaring a winner.

At 100 USDC, an optional proposed test target of at least 30% below the displayed USD-funded Wise balance fee would allow approximately USD 0.7478 of additional crypto-route costs. This is an analyst-proposed acceptance target, not a user-approved promise or a measured result.

## Approach comparison and provisional recommendation

| Approach | Strength | Cost limitation | Role in the initial prototype |
| --- | --- | --- | --- |
| Fiat-funded Wise/bank remittance | Bank endpoint without receiver crypto management | Route, amount and funding method determine total price | Baseline; no evidence yet that fiat-to-USDC acquisition produces lower total cost |
| USDC directly to an eligible recipient exchange deposit | Avoids a mandatory intermediate wallet hop | Recipient needs eligible exchange account; trade, spread and withdrawal costs remain | First candidate for an existing-USDC payer where exact deposit support is verified |
| USDC through an embedded recipient wallet | Recipient can receive or hold USDC before using an exchange | Adds another transfer and wallet operations; does not remove later exchange requirements | Optional delivery choice when it creates measured value |
| Licensed partner converts and pays THB inside the app | Could remove manual exchange steps | No accessible integration, executable price or onboarding timeline has been verified | Future option; not an assumed 24h dependency |
| One recipient accumulates recurring payouts before withdrawing | Amortizes their fixed withdrawal cost | Delays bank availability; can also be done with existing wallets/exchanges | Optional user-controlled timing, not an exclusive UVP |

Provisional recommendation: for the accepted existing-USDC payer segment, test the shortest supported delivery path, with direct-to-exchange for eligible recipients and personal-wallet delivery optional. This is a recommendation about avoiding unnecessary steps, not a verified claim of the cheapest market-wide route or a validated business.

Do not pool different recipients' balances to make the THB 20 fee appear to disappear. Sender batching and one recipient accumulating earnings are different from a service collectively converting others' funds and redistributing THB.

Independent advisor and anonymized peer-review rounds agreed on the direct-exchange counterfactual and the need to reject a low-value dashboard if it lacks substantial cost or workflow improvement. They did not establish customer demand. A recurring-payout test must compare equal principal and timing assumptions: four USD 10 payments versus one USD 40 payment, or ten USD 10 payments versus one USD 100 payment.

## Decision rule

Continue on a cost-led UVP only if a reproducible comparison shows meaningful savings against an eligible, accessible alternative after including the app's intended charge and operating costs. Beating PayPal alone does not prove "cheaper than the market."

If the direct exchange route is cheaper, the product needs a separately measured usability or workflow advantage sufficient to justify its additional cost. If neither advantage exists, change the approach rather than relaxing the success criteria.

## Sources checked

- [Binance TH published fees](https://www.binance.th/en/faq/spot-trading/91605c2481714f41becb6951906d6927)
- [Binance TH fiat withdrawal fees](https://www.binance.th/en/faq/fiat-deposit-%257C-withdrawal/9fcdfa0bb52d47479edf52cedfbd07aa)
- [Wise US-to-Thailand route](https://wise.com/us/send-money/send-money-to-thailand)
- [PayPal Thailand fee page and applicability warning](https://www.paypal.com/th/business/paypal-business-fees)
