# Current scope and stack proposal

Prepared: 15 October 2026, Asia/Bangkok. Basis: our repository's current sandbox scope and proposed v1 API contract. No product implementation exists yet.

## Outcome

Build one sender journey: USD amount and synthetic Thai recipient, quote review, simulated USD funding, actual prefunded test-USDC transfer on Avalanche Fuji, simulated THB payout, and a saved receipt.

The sender does not connect a crypto wallet or obtain gas. Dedicated service test wallets handle the token leg. An actual testnet transaction proves only that token movement; it does not prove bank credit, real USD collection, currency conversion or commercial viability.

## Evidence boundary

| Leg | Proposed implementation | What it proves |
| --- | --- | --- |
| Recipient and checks | Synthetic fixture/local simulation | Application validation only |
| USD funding | Local success/failure simulator | Stored simulated funding outcome |
| FX | Versioned illustrative fixture | Exact application arithmetic |
| Settlement | Existing test USDC on Fuji | Verified test-token movement |
| THB payout | Local simulator | Stored simulated payout outcome |

Use explicit demo labels. Completion copy: "Demo completed: testnet settlement confirmed; THB payout simulated."

## Recommended stack

| Layer | Choice | Responsibility |
| --- | --- | --- |
| UI | Next.js App Router, React, TypeScript | Send, quote, tracking and receipt screens |
| Styling | Tailwind CSS | Responsive interface |
| API | Next.js Route Handlers, Node.js runtime | Validation, ownership, quote and transfer operations |
| Storage | Supabase Postgres | Durable records, constraints and transactions |
| Chain integration | viem | Signing, broadcast, receipt and token-event verification |
| Network/asset | Avalanche Fuji, existing Circle test USDC | Actual test-token leg |
| Hosting | Vercel UI/API; Supabase database | Public demonstration |
| Progress baseline | Bounded persisted `/advance` operations | Resume from saved state while a client drives progress |
| Session baseline | Server-issued anonymous demo cookie | Owner isolation without a login feature |

Use compatible stable dependency versions when scaffolding, check Node requirements, and commit the lockfile. No versions or packages are installed by this handoff.

No separate Express/FastAPI backend, Redis, message broker, custom token, bridge, custom smart contract or end-user wallet SDK is required for this baseline. A separate worker buys processing independent of the browser; select its host and recovery model explicitly if that behavior is required.

Vercel function invocations are finite. Do not put an infinite worker loop or unawaited settlement timer in a request handler. See [Vercel limits](https://vercel.com/docs/functions/limitations).

## First complete flow

1. Establish a demo session and load its synthetic recipient.
2. Create and review a server-owned quote.
3. Accept the quote once using an idempotent transfer request.
4. Record the selected local funding outcome. Rejection stops settlement.
5. Run bounded settlement steps: prepare, persist signed intent, broadcast and reconcile.
6. Verify successful receipt and the exact expected token Transfer event.
7. Run the separate THB payout simulator; failure remains visible and retries only payout.
8. Show saved amounts, milestones, actual hash and simulation references in the receipt.

Quote acceptance uses server time. Amounts are integer strings; accepted amounts are immutable. A timeout remains unknown/pending until reconciled. Reading status does not cause another payment.

The v1 API directly creates the final fixture quote. A separate estimate/check stage and funding deadline from the friend's v2 are useful extensions, but are not already specified by our v1 API. See [comparison](handoff-comparison.md).

## Scope limits

Defer reverse direction, real cards/banks, live FX, real KYC, mainnet money, stored balances, multiple countries, a custom contract and unrelated AI features. External fiat-provider credentials are not a prerequisite.

AI-assisted development is the original proposed track fit. The two handoffs disagree about selected track; verify selection and official qualification rules. No in-product AI feature is required by this technical plan. The reported sponsor bonus is an objective, not awarded points.

No deadline, worker host, production provider, product name or measured cost advantage is established by this package.

## References

- [Next.js backend guide](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Supabase database](https://supabase.com/docs/guides/database/overview)
- [viem contract writes](https://viem.sh/docs/contract/writeContract)
- [Avalanche C-Chain RPC](https://build.avax.network/docs/rpcs/c-chain)
- [Circle USDC addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses)

Recheck chain/token configuration against official sources and the actual RPC before implementation.
