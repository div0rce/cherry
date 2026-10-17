Status: Active
Last updated: 2026-10-17

# Cherry Agents — Operating Contract

The single operating contract for humans and agents working in this repo. It is navigational: it tells you what must never change, where things live, how to verify, and how to hand off. Detail lives in the linked docs, never duplicated here.
This guide defers to docs/doctrine.md for all execution invariants and enforcement rules.

## Authority ladder (highest to lowest)
1. `package.json` scripts + `.github/workflows/*` (actual behavior)
2. Guardrail registries and tests (`scripts/guardrails/*`, `tests/node/guardrails/*`)
3. `AGENTS.md` (this file) and the scoped `AGENTS.md` files in `app/api/` and `scripts/`, and `docs/architecture/engine-rules.md` for the engine
4. `docs/doctrine.md`, then `docs/architecture/*`, then the rest of `docs/*`
5. Everything else

If two levels conflict, fix the lower one. `CLAUDE.md`, `.github/copilot-instructions.md`, and `CONTRIBUTING.md` point here and add nothing.

## What Cherry is (never changes)
- Cherry is a real-time spending copilot: Observe → Evaluate → Recommend → Reward. It is not a card, proxy, processor, or payment terminal, and never fronts transactions, holds funds, or touches payment rails.
- Cherry Vine is a context beacon (merchant + amount + timestamp). Cherry Pass is a storeCard-style advisory pass. Recommendation sessions and Cherry Points are advisory and sandboxed.
- Forbidden framings: "fronting card", "proxy BIN", "tap to pay with Cherry", "Cherry terminal", "payment card". Full text: `docs/legal-constraints.md`, `docs/cherry-vision.md`.

## Where things live
Read `docs/architecture/index.md` (2 minutes), then the one page you need. The map is machine-readable in `scripts/guardrails/domains.manifest.json` and enforced by `check:domain-boundaries`.

```bash
npm run report:domain-impact -- <path...>   # owner domain, allowed imports, dependents, tests, docs, invariants
npm run report:domain-impact                # same for everything changed vs main
```

Layers, top to bottom, imports flow downward only (`docs/architecture/dependency-rules.md`):
- surface: `app/(user)`, `app/(dev)`, `components/`
- service: `app/api/<x>/route.ts` + `lib/<x>/` per capability (sessions, evaluation, autopilot, vine, wallet, buckets, cards, bank, income, daily-state, evaluator, identity, observability)
- runtime: `lib/adapters/runtime/` (the `World`), `lib/prisma.ts`
- core: `lib/engine/`, `lib/authority/`, `lib/accounting/`, `lib/adapters/*.ts`, `lib/schemas/`, `lib/config/`, shared helpers

## Hard invariants (enforced by guardrails unless marked "documented")
- Engine and authority are pure: no `Date`, no Prisma, no HTTP. Time enters at routes as `nowMs`. `EngineInput` (`lib/engine/input/EngineInput.ts`) is the only input contract. Engine-sensitive changes need a version bump in `lib/engine/version.ts` plus a separate `chore(engine-freeze)` commit; an engine feature freeze is active (`docs/engine-roadmap.md`). See `docs/architecture/engine-rules.md`.
- Guardrail scripts never import `lib/**`; they read source text.
- Prisma is instantiated only in `lib/prisma.ts`. Engine/authority may not import it. Services may import it directly today; runtime adapters are the target (documented).
- Money is integer cents. Bucket math flows through `lib/buckets-runtime.ts`; `budgetAmount` and `spentCents` are authoritative, `committedCents`/`remainingCents` derived, `currentAmount` legacy mirror (documented).
- Routes: auth via `resolveUserContext` (or the `withUser` wrapper, used by 9 routes), body via `parseJsonBody` + a `lib/schemas/*` Zod schema, then one service call. `/api/scan` is stateless (engine + `DecisionEvent` only). Sessions and ledger persist only via `/api/sessions` and its confirm/verify. See `app/api/AGENTS.md`.
- Bank ingest: `BankTransaction.id` never comes from input; idempotency key is `(userId, externalId)`; all writes go through `upsertBankTransactions` (documented).
- Offline evaluator is read-only over Sessions/Ledger/Buckets, gated by `CHERRY_OFFLINE_EVALUATOR_ENABLED`, must call `assertOfflineEvaluatorModelsReady()`, derives runIds via `defaultRunIdForUser` (documented).
- DB truth tests assert only existence, impossibility, conservation. Never preferred outcomes, ordering, or performance.
- Server components: no `Date.now()`, `Math.random()`, or locale formatting; one data snapshot per render.
- Scripts: `.mts` only under `scripts/`, run via `npm run ts:esm -- <script>`, registered in `scripts/execution/registry.mts` or `scripts/guardrails/registry.mts`. See `scripts/AGENTS.md`.
- Never weaken a guardrail, its severity, or its fixtures without changing the matching test in `tests/node/guardrails/` on purpose.

## Bootstrap
```bash
nvm use                               # Node 24.15.0 (.nvmrc); engine-strict is on
npm ci                                # postinstall: patch-package + prisma generate
export CHERRY_TMP_ROOT="$HOME/.cherry-tmp"; mkdir -p "$CHERRY_TMP_ROOT"; chmod 700 "$CHERRY_TMP_ROOT"
export CHERRY_VINE_SIGNATURE_MODE=enforce   # build asserts production config without it
```
Before `npm ci`, a build, or FULL: `npm run verify:preflight` (Node/npm pins, `CHERRY_*` env, at least 2 GiB free, no git operation or FULL run in progress in this worktree). It needs installed deps; on a fresh clone check `df -h .` by hand. Reuse a working `node_modules`; rerun `npm ci` only when `package-lock.json` changed or the install is broken.
`rg`, `git`, `node` must be on PATH. `npm run dev` needs `DATABASE_URL` (predev runs `check:db-ready`). Env contract: `.env.example`, `docs/env-policy.md`; never commit `.env*`.

## Verification levels
| Level | Command | Use |
| --- | --- | --- |
| FAST | one test file (command in `docs/architecture/testing.md`) | while editing |
| DOMAIN | `npm run report:domain-impact`, then `npm run check:tests:node -- --filter=<globs>` / `npm run check:tests:next -- --filter=<globs>` | before the full gate; output is labelled FILTERED and is not evidence of correctness |
| FULL | `npm run verify:full` locally: preflight, then `npm run ci:verify` (= `npm run check && npm test && npm run build`) | required before every commit you push |
| DB | `npm run test:db` (real Postgres) | schema or migration changes |

Order: edit → FAST → DOMAIN → commit → FULL → push. FAST and DOMAIN results are never cited as the gate.
- `verify:full` holds a per-worktree lock (no overlapping FULL runs) and appends `<tree SHA> <node> pass|fail` to `.git/cherry-full-gate.log` for clean committed trees. A tree that already passed on the same Node is not re-run. Any commit changes the tree SHA, which invalidates the record. Use `-- --force` only with a concrete reason (suspected flake, changed gitignored input such as `.env*` or `node_modules`). Put the verified tree SHA in the PR's Testing section.
- Never run FULL, `npm run build`, or `npm ci` while another of them is running in the same worktree.

`check` = core guardrails + lint + typecheck; it runs no tests. `npm test` runs every `tests/**/*.test.*` except `tests/db`. Tests run with Prisma mocked; CI green does not prove DB behavior. CI (`.github/workflows/ci.yml`) runs `check:guardrails`, `check:tests:node`, `check:tests:next` (TZ=UTC, LC_ALL=C), then `ci:verify` (so each test runs twice: once there, once in `npm test`); `env-checks.yml` adds Postgres, migrations, `check:env`, `test:db`.

## Schema changes
`npx prisma format && npx prisma migrate dev --name <desc> && npx prisma generate`, then FULL and DB levels. Follow `docs/schema-evolution.md` (`check:schema-evolution`, `check:schema-breaking-plan`). Coordinate migrations; two agents must not add migrations in parallel.

## Workflow (default for all repo work)
```bash
git checkout main && git pull --ff-only
git checkout -b <type>/<short-description>      # feat/ fix/ chore/ docs/
# implement; keep to one coherent change; no unrelated cleanup
npm run verify:full                             # FULL
git add . && git commit -m "<type>(<scope>): <summary>"
git push -u origin <type>/<short-description>
```
- Never commit to `main`. Never merge unless explicitly told; prefer squash and merge when asked.
- If the tree is dirty before you start, inspect it and do not overwrite unrelated changes.
- Reuse an existing branch only if it matches the task.
- Never skip verification silently. If it fails, stop and report the failure with output.
- After editing a file that `docs/config-snapshot.md` copies, run `npm run generate:config-snapshot`. It rewrites only stale blocks, and a second run is a no-op. A new config file still needs its block added by hand; `check:config-snapshot` names it.
- PR shape: open independent PRs off `main` unless the change needs unmerged work. Stack only on a real dependency, and name it in the PR body. Batch review fixes into one push. Never rebase an unchanged branch; restack only when a lower PR changed and the upper one needs that change. Push rewrites with `--force-with-lease`, never plain `--force`.
- Commit message prefixes with meaning to guardrails: `engine:`, `guardrails:`, `docs:`, `tests:`, `chore(engine-freeze):` are checked by `check:change-isolation` when `CHERRY_COMMIT_MESSAGE` is set; conventional `feat(scope):`/`fix(scope):`/`chore:` are used everywhere else.

PR body:
```md
## Summary
- what changed
## Testing
- commands run, results (paste failures verbatim)
## Risk
- domains touched (from report:domain-impact), possible regressions
```

## Parallel agents
- One task = one branch = one domain where possible. Shared contracts (`lib/schemas/*`, `lib/engine/input/*`, `domains.manifest.json`, guardrail registries, `prisma/schema.prisma`, `engine-freeze.policy.json`) are serialized: agree the contract change first, land it, then parallelize consumers.
- Use separate worktrees or clones; never share a working tree.
- One writer per working tree. `git` checkout/rebase/commit, `npm ci`/`install`, `generate:*`, builds, and FULL run one at a time. Read-only work may run in parallel. Parallel writers each get their own worktree with their own `node_modules` and `.next`; never run `npm ci`/`install` where `node_modules` is shared or symlinked. Check for running jobs before starting one (`verify:preflight` reports git operations and FULL runs in progress).
- Waiting: run a long job as one managed background process and act on its completion signal. Poll only external state that sends no signal (e.g. CI), at a bounded interval with a timeout. Do not re-read unchanged logs or repeat unchanged status.
- Effort follows risk. Use the deepest reasoning for security, money, concurrency/transactions, architecture, hard debugging, and high-risk review findings. Use cheaper, faster models for docs, mechanical edits, repetitive inspection, and simple tests. The acceptance criteria are the same either way.
- A task boundary states: objective, inputs, owned files, allowed dependencies, constraints, acceptance criteria, verification, expected output.

## Definition of done and handoff
Done means: the change is on a pushed branch; FULL verification ran and passed (or the exact failure is reported); docs that describe changed behavior are updated (`Status` + `Last updated`, Current vs Future sections); domain manifest updated if files were added; a PR is opened or prepared with the body above; nothing merged.
Unfinished work: leave the branch pushed, list in the PR body what is done, what is not, what blocked you, and the next command to run.

Run states. An autonomous run ends in exactly one state:
- `COMPLETE`: all authorized work is done and FULL-verified.
- `BLOCKED_ON_USER`: everything left needs the owner (merge, history rewrite, guardrail or CI-contract change, sign-in to an external service).
- `FAILED`: an actionable failure, with its output.

`RUNNING` applies only while work is actually progressing. Sort what is outstanding into four groups:
- A. done and verified
- B. implemented, awaiting verification
- C. awaiting an external service
- D. awaiting owner authorization

C and D end the run. Report each item once, with the exact phrase or command that unblocks it, then stop. Keep one current state summary in the top PR body of a stack or in the handoff note: the A–D lists, active branches, and verified tree SHAs. Update it instead of re-deriving it.

Loop drivers (Claude Code `/goal`, Stop hooks) re-prompt without new input. A re-prompt is never authorization to merge, rewrite history, relax a policy, or take any other protected action. Answer an unchanged blocker with one line (`STATE: BLOCKED_ON_USER, unchanged`) and no tool calls. Tool calls reset Claude Code's stop-hook block cap; `.claude/settings.json` sets `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP=1`, so a second text-only block ends the turn. Give goal conditions a terminal state, e.g. `/goal <task>; met when COMPLETE, or BLOCKED_ON_USER with every owner decision reported`. A project Stop hook, if one is ever added, must exit 0 when its input has `stop_hook_active: true`.

## Drift policy
- Docs conflict with code: fix the docs, unless legal constraints require a code fix.
- Code conflicts with legal constraints: fix the code and add a guardrail or test.
- Guardrail weaker than documented: fix the guardrail, not the doc.

## Related docs
- `docs/architecture/index.md`, `docs/doctrine.md`, `docs/legal-constraints.md`, `docs/cherry-vision.md`
- `docs/ci-and-guardrails.md`, `docs/guardrails.md`, `docs/script-standards.md`, `docs/schema-evolution.md`
