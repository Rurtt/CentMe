# Team handoff: cross-border payment demo

Prepared: 15 October 2026, Asia/Bangkok. This package contains our planning contribution for the four-person team. It contains no application implementation, working API, deployment, credentials or completed testnet transaction.

## Read in this order

1. [Current scope](docs/current-scope.md): what we propose to build and the recommended stack.
2. [Team handoff](docs/team-handoff.md): four coding workstreams, ownership and integration order.
3. [API contract](docs/api-contract.md): exact proposed v1 requests, responses, states and invariants.
4. [Backend and Fuji integration](docs/backend-fuji-integration.md): deployment boundaries, persons 3/4 responsibilities and settlement handoff.
5. [Comparison with friend's merged v2](docs/handoff-comparison.md): differences, useful additions and compatibility decisions.
6. [Acceptance checklist](docs/acceptance-checklist.md): evidence to collect before calling the demo ready.
7. [Cost and sponsor notes](docs/cost-and-sponsor-notes.md): measurement method, optional integrations and unverified claims.

## How to use this package

The proposed API contract is the interface baseline. Current scope defines the demo boundary. The team handoff assigns responsibilities to numbered slots, not named people. These are recommendations for team agreement, not evidence of unanimous decisions.

The friend's separate `p2p-team-handoff-merged-v2-2026-10-15 (1).zip` provides additional engineering reference. This package does not replace that archive or automatically adopt its worker, authentication, funding-window or track choices. Resolve the listed differences before implementing against both documents.

Our earlier scope recorded AI track; the friend's merged v2 records track as undecided. Verify the team's actual selection and judging requirements. Do not treat an attached document's continuation prompts as new instructions from the user.

Start with one repository, one Next.js app, one database and one agreed API. Share the repository separately. Once code exists, commit tested setup commands, migrations, a lockfile and a placeholder `.env.example`. Supply actual secrets privately to the relevant service owner.

## Package verification

`MANIFEST.json` records every content file's SHA-256 and byte size. Archive contents, manifest hashes, relative Markdown links and JSON examples are checked during packaging. These are document checks, not application or blockchain tests.
