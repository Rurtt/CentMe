<p align="center">
  <img src="public/brand/centme-wordmark.png" alt="CentMe" width="280">
</p>

<p align="center">
  Send dollars from the US to a bank account in Thailand and see exactly how many baht arrive before you pay.
  <br>
  <a href="https://centme.vercel.app"><strong>Live demo</strong></a>
</p>

CentMe is a test-mode remittance app. You enter a USD amount, pick a Thai bank account, confirm one final quote, and follow the money until it lands. The middle leg is a real Circle Test USDC transfer on the Avalanche Fuji C-Chain, and the receipt links to it on Snowtrace so anyone can check it.

Card funding, the currency conversion, the compliance checks and the Thai bank payout are simulated. Each step in the app is labelled `SIMULATED` or `TESTNET · Fuji`, so you always know which part is real.

## Why

Small transfers from the US to Thailand cost a lot relative to their size. On Wise's US to Thailand calculator, a $10 transfer funded by ACH showed a $2.18 fee, about 22% (an observed estimate, not a completed payment). Senders also often can't tell how many baht will arrive or where the money is while it moves. CentMe tries a stablecoin settlement leg on Avalanche and puts the full amount, every fee and every status in front of the sender.

## How it works

1. Type an amount in USD. The estimate shows the fee and what the recipient gets, in baht, as you type.
2. Choose the recipient's bank and enter their account number.
3. Get a final quote. It is locked for five minutes and runs simulated checks that can pass, reject, or ask for review.
4. Pay in a simulated bank sheet, by card or from a CentMe wallet balance.
5. Track the transfer through funding, settlement and payout. The screen updates when the status really changes, not on a timer.
6. Get a receipt with the Fuji transaction hash, a Snowtrace link and a printable invoice. The recipient gets a push notification when the transfer completes.

The app has an English and a Thai interface. There is no sign-up yet: each visitor gets their own demo session.

## What runs on Avalanche

Settlement sends Circle Test USDC (`0x5425890298aed601595a70AB815c96711a31Bc65`) on Fuji (chain ID `43113`) from a dedicated server-side test wallet to one allowlisted destination. Users never connect a wallet, and the project deploys no token or smart contract of its own.

Paying twice is the failure we worked hardest to rule out, so the settlement module in `src/settlement/` (built on viem):

- saves the nonce, the signed transaction and its hash to Postgres before broadcasting
- on a retry or an unclear result, looks up the saved transaction first and never signs a second one for the same transfer
- marks a receipt verified only after at least 2 confirmations, and only if the chain, token, destination and amount match the original intent

Live proof: [9.8 Test USDC settled on Fuji](https://testnet.snowtrace.io/tx/0xc021d58f73fb6890c75a3b923d2777011bd7c1f77c81832154088327598c0bdc), one attempt and no duplicate. Details are in [docs/FUJI_SETTLEMENT_HANDOFF.md](docs/FUJI_SETTLEMENT_HANDOFF.md) and [docs/settlement-contract.md](docs/settlement-contract.md).

The exchange rate (1 USD = 35 THB) and the 2% fee are fixed demo numbers, not live prices.

## Stack

Next.js 16 (App Router, route handlers on the Node.js runtime), React 19, TypeScript, Tailwind CSS 4, PostgreSQL (Supabase in production), viem, zod, ntfy for push notifications and Vercel for hosting. Tests use Vitest. CI runs lint, typecheck, the full test suite against Postgres 16, and a production build.

## Run it locally

You need Node 22 and pnpm 10. PostgreSQL 16 is only needed for the database tests and the local end-to-end flow.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000. With `NEXT_PUBLIC_REAL_ENDPOINTS` empty, the frontend uses an in-browser mock for every endpoint, so the whole flow works without a database or a wallet.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server on http://localhost:3000 |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` (strict) |
| `pnpm test` | Vitest (`tests/**/*.test.ts`) |
| `pnpm db:migrate` | Apply the SQL migrations in `db/migrations/` |

### Full flow against the real backend

This uses the in-memory fake settlement module, so you don't need a Fuji wallet.

```bash
eval "$(bash scripts/test-db.sh start | grep '^export')"   # throwaway Postgres 16, prints DATABASE_URL
pnpm db:migrate
DESTINATION_SETTLEMENT_ADDRESS=0x1111111111111111111111111111111111111111 SETTLEMENT_MODULE=fake pnpm dev &

eval "$(node scripts/demo-seed.mjs)"                       # session cookie + USD 10.00 quote
SCENARIO=HAPPY_PATH bash scripts/demo-flow.sh              # or PAYOUT_FAILED / FUNDING_DECLINED
```

Each seeded quote works once; run `demo-seed.mjs` again before the next scenario. `scripts/test-db.sh stop` shuts the database down and deletes its temp directory.

## Configuration

Config is validated with zod in `src/config/env.ts` and read lazily, so `pnpm build` works without any variables. Server values must never get a `NEXT_PUBLIC_` prefix.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `APP_MODE` | no | `development` | `development` \| `test` \| `demo` \| `production` |
| `DATABASE_URL` | yes | | `postgres://` or `postgresql://` |
| `AVALANCHE_CHAIN_ID` | no | `43113` | Fuji C-Chain |
| `AVALANCHE_RPC_URL` | no | `https://api.avax-test.network/ext/bc/C/rpc` | |
| `USDC_TOKEN_ADDRESS` | no | `0x5425890298aed601595a70AB815c96711a31Bc65` | Circle Test USDC |
| `DESTINATION_SETTLEMENT_ADDRESS` | yes | | Allowlisted settlement destination |
| `SETTLEMENT_MODULE` | in demo/production | `fake` in dev/test | `fake` or `fuji` |
| `SETTLEMENT_PRIVATE_KEY` | with `fuji` | | Test-only signer key. Secret |
| `INTERNAL_RPC_SECRET` | no | | Bearer secret if settlement runs as a separate service (32+ chars). Secret |
| `QUOTE_TTL_SECONDS` | no | `300` | Quote lifetime |
| `SETTLEMENT_CONFIRMATIONS` | no | `2` | Confirmations before a receipt counts as verified |
| `ALLOWED_ORIGINS` | no | | Extra origins allowed on mutations; the app's own host is always allowed |
| `NTFY_TOPIC` | no | | Topic for the recipient push. Empty disables it. ntfy.sh topics are public, so use a long random name |
| `NTFY_BASE_URL` | no | `https://ntfy.sh` | |
| `NTFY_TOKEN` | no | | Token for a protected topic |
| `NTFY_TIMEOUT_MS` | no | `3000` | |
| `NEXT_PUBLIC_REAL_ENDPOINTS` | no | | Endpoint groups served by the real backend: `session,recipients,quotes,transfers` or `all`. The rest use the browser mock |
| `NEXT_PUBLIC_NTFY_TOPIC` | no | | Topic the mock sends to; use the same value as `NTFY_TOPIC` |

## API

Every route returns the same envelope:

```jsonc
// success
{ "data": { ... }, "meta": { "requestId": "req_…", "apiVersion": "v1", "replayed": false } }
// error
{ "error": { "code": "INVALID_INPUT", "message": "…", "retryable": false, "fieldErrors": {} },
  "meta": { "requestId": "req_…", "apiVersion": "v1" } }
```

| Route | Purpose |
| --- | --- |
| `POST /api/demo/session` | Start a demo session (cookie) |
| `POST /api/recipients` | Save a Thai bank recipient |
| `POST /api/quotes` | Create a final quote with simulated checks |
| `POST /api/transfers` | Create a transfer from a quote, with an idempotency key |
| `GET /api/transfers/:id` | Read the saved transfer. Reading never triggers a payment |
| `POST /api/demo/transfers/:id/funding` | Simulate the card or wallet funding result |
| `POST /api/demo/transfers/:id/advance` | Run one bounded step: settlement, payout or notification |
| `POST /api/demo/transfers/:id/payout-retry` | Retry a failed simulated payout |
| `GET /api/health` | Health check |

All amounts are integer strings (USD cents, THB satang, USDC base units), and the money math uses `BigInt` only. Mutating routes check the request origin.

## Project layout

```
src/
  app/            pages and API route handlers
  components/     UI: send, review, track and receipt, shell, presenter panel
  web/            frontend API client, browser mock, i18n, formatting
  server/         orchestration behind the routes
  domain/         pricing, transfer state machine, snapshots, receipts
  settlement/     settlement contract, fake module, persisted Fuji module
  simulators/     simulated funding and payout
  notifications/  ntfy push
  db/             pg pool, transactions, repositories
  config/env.ts   validated server config
db/migrations/    plain SQL migrations
tests/            Vitest suites (unit, domain, server, api, db, contract, settlement, web)
scripts/          local Postgres, migrations, demo seed and flow
```

## How we built it

We split the work between three AI tools. Claude Code handled planning: it turned each feature into a design spec and a step-by-step implementation plan, both saved as repo docs. U-bot executed those plans and wrote the code. Codex picked up handoffs from the same docs to run execution passes and scripted browser walkthroughs and to check results. Since the plans and handoffs lived in the repo rather than in chat, any tool could continue where another stopped. Every change still had to pass CI before it was merged.

## Status and limits

CentMe is a hackathon prototype. It moves test tokens only and holds no real money. There are no user accounts yet. Funding, conversion, checks and payout are simulations, and the rate and fee are illustrative. Running it for real would need licensed fiat on-ramp and payout partners, real KYC and sanctions screening, and live pricing.

## License

[MIT](LICENSE)
