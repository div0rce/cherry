Status: Accepted
Last updated: 2026-09-22

# ADR 0002 — One authority for agent instructions

## Context
The same operating rules (branch/PR flow, legal framing, Prisma/Zod/withUser rules) were copied across `AGENTS.md`, `CONTRIBUTING.md`, `.github/copilot-instructions.md`, `README.md`, and `CLAUDE.md`, and several copies had drifted (`@/` alias that does not exist, `withUser` described as universal when 9 of 35 routes use it, CI steps misdescribed).

## Decision
- `AGENTS.md` is the only operating contract. It is short, navigational, and links to `docs/architecture/*` and `docs/doctrine.md` for detail.
- `CLAUDE.md` and `.github/copilot-instructions.md` are two-line pointers to `AGENTS.md`. Claude Code and Codex both read `AGENTS.md`; Copilot reads its own file.
- `CONTRIBUTING.md` keeps only human-workflow content (branch naming, engine-change label) and points to `AGENTS.md` for the rest.
- Scoped `AGENTS.md` files exist only where a directory has rules the root cannot express briefly: `lib/engine/`, `app/api/`, `scripts/`. They reference the root and never restate it.
- Docs describing behaviour must match code; where they did not, the doc was corrected rather than the code, except where a guardrail was found to be weaker than documented (`check:engine-prisma` import patterns), which was fixed in code.

## Consequences
- A rule appears in exactly one place; drift is visible as a broken link rather than a contradiction.
- Agents entering the repo read `AGENTS.md` (about 150 lines) and one architecture page, instead of five overlapping files.
