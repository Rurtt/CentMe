# Idea Brief: Stablecoin Payouts for Asian Creators and Esports Players

Locked: 2026-10-15 · Event: U-Hackathon 2026 (24h, sponsor: Avalanche) · Team: 4

> Review update (2026-10-15): the original approach below is under revision. See [the proposed MVP scope](superpowers/specs/2026-10-15-usdc-payout-mvp-design.md) and [the cost review](cost-check.md). External cash-out is acceptable for the MVP; in-app bank delivery and the original ~99% claim are not validated requirements or promises.

## Problem
Asian creators, esports players and community staff work inside English-speaking online communities (Minecraft servers, Discord communities, esports events) and get paid from abroad. Today the money goes through PayPal and similar platforms:
- Fees of ~4-5% plus a bad FX spread, so receivers get less and the payer looks bad.
- Accounts get blocked or limited, and the money gets stuck. Real case: a Thai staff member of Ranked Bedwars has money stuck after his PayPal got blocked.
- Crypto would be cheaper and faster, but setup (seed phrases, networks, exchanges) is too hard for normal users.

Origin story: our team won prize money while under 18, and it got stuck.

## User
- **Payer (customer):** game community owners, esports event organizers and creator platforms paying many people in many countries. KYC is required.
- **Receiver:** 18+ creators, esports players and community staff in Asia, starting with Thailand.

## UVP
"Pay 50 people abroad in one click. It arrives in seconds, and they keep ~99% of the value."
- Receivers log in with a passkey. They never see a seed phrase and see their balance in THB.
- Non-custodial: receivers hold their own smart wallet, and we never hold user funds.
- Rail: native USDC on Avalanche C-Chain, with fast finality and low fees.
- Do NOT claim "can't get stuck": Circle can freeze USDC, and Thai exchanges and banks freeze suspected mule accounts.

## Revenue
- A SaaS fee per payout batch, charged to the payer and priced below PayPal.
- Fees per person on small staff wages are too small (~$0.50 on a $20 payout), so bigger batches come first: esports prize pools and creator bounties.

## Scale path
Thailand → other Asian creators in English-speaking communities (Vietnam, Indonesia, Philippines, Malaysia), each with a local licensed cash-out partner. Later: guardian mode for minors.

## Judging
- 40% practicality
- 40% app execution
- 10% UI/UX
- 5% partner integration
- 5% usability
- Using Avalanche gives bonus points.

## MVP scope (24h)
1. **Payer page:** connect wallet, add receivers and amounts, then do a bulk payout through a split contract on Fuji testnet.
2. **Receiver app:** passkey login (Privy or thirdweb, test on the venue laptop), a THB balance from a price feed, and transaction history.
3. **Cash-out screen:** the receiver withdraws to their own account at a licensed Thai exchange, and the exchange pays out to PromptPay.
4. **Live proof on stage:** send ~$1 of real USDC on Avalanche mainnet to a teammate, who deposits it to the exchange, sells, withdraws to PromptPay, and shows the THB arriving on their phone.
5. **Transparency:** a live Snowtrace link and a tracker screen showing where the money is at each step.
6. **Safety in the product:** a cap per receiver and payer KYC (mocked in the demo but shown in the flow).

Cut: gasless paymaster (flaky on Fuji), multi-country, voice alerts, credit history.

## 1-day kill test (before the hackathon)
- 2026-10-15: global Binance lists USDC/USDT on AVAX C-Chain, but it is NOT usable for the live proof. It is unlicensed in Thailand and THB only comes via P2P, which risks a frozen bank account (mule-account pattern). Do not use P2P.
- Still to check, in order: (1) Binance TH and (2) Bitkub, for USDC/USDT deposits on AVAX C-Chain. Fallbacks: (3) swap USDC to AVAX on-chain and deposit AVAX on C-Chain; (4) bridge native USDC with Circle CCTP to a chain the Thai exchange accepts.
- Use native USDC `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E`, not USDC.e.
- Do one real $1 mainnet run end to end. If it can't reach PromptPay, rethink the live proof.
- Build a working Privy/thirdweb passkey login on Fuji in under 2h.

## Top risks and answers
| Risk | Answer |
|---|---|
| A fan-out tool for scam or mule money | Payer KYC, a cap per receiver, a sanctions screen (Chainalysis oracle), and the exchange's own KYC as a second gate. Put this on a compliance slide. |
| Thai SEC: crypto as payment for services, plus tax | The design is non-custodial. Receivers sell as individuals on a licensed exchange. Plan to find a licensed cash-out partner. Receivers declare the income. |
| Minors can't KYC | Target 18+ first. Guardian mode is on the roadmap. |
| Payer onboarding friction | The payer buys USDC via a Coinbase bank transfer. The payer's wallet holds a little AVAX for gas. |
| "Why not Wise/Binance?" | Wise needs both sides set up and is little known among Asian teens. Binance is custodial and complex. We are one link, one passkey, one click. |
| "Why Avalanche?" | Fast finality, low fees, and native USDC on C-Chain. Show the real gas cost of a batch. |
| Live demo fails | Pre-fund 3 wallets, deploy to a real URL rather than localhost, and record a backup video. |
| Small business case | This is a hackathon project first. It becomes a startup only with a licensed Thai cash-out partner. |
