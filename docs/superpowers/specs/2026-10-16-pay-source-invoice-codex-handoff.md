# Codex handoff: CentMe pay source + invoice

Date: 2026-10-16. From Claude Code (limits low) to Codex.

## State

- Spec done: `docs/superpowers/specs/2026-10-16-centme-pay-source-invoice-design.md`
- Implementation plan done (765 lines, Tasks 0-5, full code + tests per step): `docs/superpowers/plans/2026-10-16-centme-pay-source-invoice.md`
- Nothing implemented yet. No code written for this feature.
- Code repo: `D:\U-hackathon_backend`. Currently on `feat/ui-polish-recipient`, working tree **clean** (checked 2026-10-16), so the plan's Task 0 "10 uncommitted files" warning is already resolved.

## Your job

Execute the plan task by task. Do not rewrite or re-plan it.

1. Read the spec, then the whole plan (Global Constraints + Review Focus first).
2. Task 0: confirm `git status --short` is empty, then `git switch -c feat/pay-source-invoice`, then baseline `pnpm test` and `pnpm typecheck`. Stop and report if baseline fails.
3. Tasks 1-4: TDD as written. Failing test first, run it, implement, run it green, commit per task. Tick `- [ ]` boxes in the plan file as you go.
4. Task 5: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, browser walkthrough (mock mode, 1280px + 375px, EN + TH), append `## Walkthrough results` to the plan in the U-Hackathon repo and commit there.

## Hard rules (from plan, repeated so they are not missed)

- Frontend only. Never touch `src/app/api/`, `src/server/`, `src/db/`, `src/domain/`, `src/lib/`, `src/settlement/`, `db/`.
- Wallet debits only on `funding.status === "ACCEPTED"`, once per transfer id (refresh must not double-debit).
- Every new EN i18n key gets a TH key (parity test).
- Lucide icons only, no emoji.
- Do not push or open a PR until Pong says yes. PR base = whatever `feat/ui-polish-recipient` targets.
- If something in the plan does not match the real code (file moved, type name differs), stop and report the mismatch instead of guessing.

## Report back

Per task: files changed, test command output summary line, commit hash. At the end: walkthrough results and anything skipped.
