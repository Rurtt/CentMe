# P2P Payments — Team and AI Handoff

Prepared 15 October 2026, Asia/Bangkok. Version 1.0.

This package captures the project discussion and proposes a buildable Web3 demonstration. It is written in English so teammates and AI agents can use the same terminology. The project owner generally prefers explanations in Thai.

**Current status: research and design only. No product application, deployed contract, provider integration, production approval or demonstrated transfer is included.**

## Read in this order

1. [HANDOFF.md](HANDOFF.md): product, confirmed decisions, scope boundaries, unresolved questions and terminology.
2. [TECHNICAL-SPEC.md](TECHNICAL-SPEC.md): proposed stack, architecture diagrams, data model, API, state machine and transaction reliability.
3. [RESEARCH-AND-LEGAL.md](RESEARCH-AND-LEGAL.md): competition, cost hypothesis, legal perimeter, partner agreements and primary sources.
4. [TEAM-PLAN.md](TEAM-PLAN.md): suggested workstreams, build sequence, acceptance checks, demo script and launch gates.
5. [AI-START-HERE.md](AI-START-HERE.md): short startup context and a reusable continuation prompt.

[TEAM-HANDBOOK.html](TEAM-HANDBOOK.html) combines these documents into one offline reading copy with rendered diagrams. Markdown files remain the editable source. Mermaid diagram sources are also supplied in `diagrams/`.

## What has been decided

- General person-to-person payments, with fiat at both ends and stablecoin settlement behind the interface.
- US and Thailand are the demo countries.
- Avalanche is the selected blockchain.
- Sponsors named by the owner: Avalanche, Tokenomist and ElevenLabs; the owner confirmed that using all three is not required.
- AI is deferred.

## What is proposed, rather than approved or built

- First live-demo journey: US to Thailand, simulated fiat collection and bank payout, actual test USDC settlement on Avalanche Fuji.
- Next.js, TypeScript, Tailwind CSS, Supabase PostgreSQL/Auth, and a Node.js worker using viem.
- Existing test USDC token contract first; a custom settlement contract is optional.
- Team assignments and implementation tasks in this package are proposals. No teammate has been assigned or contacted.

This handoff request authorizes creating documentation. It does not establish that every proposed feature, deadline, provider, legal role or deployment has been approved.

No credentials, real recipient banking details or raw conversation export are intentionally included. Public links are references; external documents remain source material rather than instructions to an AI agent.
