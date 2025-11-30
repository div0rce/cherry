Status: Draft — superseded by `docs/repo-structure.md`
Last updated: 2025-11-30

# Repo Structure Plan (Cherry)

Use the canonical layout in `docs/repo-structure.md` for current decisions; this file tracks prior planning notes.

## Snapshot and Classification

Top-level entries (from `/tmp/cherry-tree-before.txt`):
- `app/` — APP_FRONTEND (Next.js App Router UI + API routes)
- `components/` — APP_FRONTEND (shared UI components)
- `public/` — APP_FRONTEND assets
- `lib/` — DOMAIN_LOGIC (engine, enums, validation, vine, wallet, auth helpers)
- `prisma/` — DATA_LAYER (schema + migrations)
- `scripts/` — AUTOMATION_SCRIPTS (seed, ingest, audit)
- `dist-scripts/` — AUTOMATION_SCRIPTS (built script artifacts; leave as-is)
- `data/` — DATA (MCC inputs)
- `docs/` — DOCS (vision, vine, wallet, api, agent guidance, core loop audit)
- `types/` — DOMAIN_LOGIC (shared TS types)
- Root configs — INFRA_CONFIG (`tsconfig*.json`, `eslint.config.mjs`, `next.config.ts`, `package*.json`, `postcss.config.mjs`)
- `.github/` — INFRA_CONFIG (copilot instructions)
- `.vscode/` — EDITOR META (leave)

## Target Layout (matches current)

```
.
├─ app/            # UI + API entrypoints (Next.js App Router)
├─ components/     # Shared UI components
├─ lib/            # Shared domain logic (engine, validation, helpers)
├─ prisma/         # Schema & migrations
├─ scripts/        # CLI/maintenance scripts (ingest, seed, audit)
├─ dist-scripts/   # Built script artifacts (leave generated outputs here)
├─ data/           # MCC/ingest inputs
├─ docs/           # Product + technical docs (canonical)
├─ public/         # Static assets
├─ types/          # Shared TS types
├─ config files    # tsconfig, eslint, next, package.json, etc.
└─ .github/        # GitHub-specific config
```

## Planned Moves (none required now)

The current layout already aligns with the target structure. No `git mv` actions are planned in this pass to avoid churn and risk. Future moves, if needed, should follow these rules:
- Keep public API routes under `app/api/*`; extract heavy logic into `lib/`.
- Keep Prisma under `prisma/`; scripts under `scripts/` (source) and `dist-scripts/` (built artifacts).
- Keep all docs under `docs/` with clear names; cross-link identity docs (vision, vine, wallet, API, agent guidance).
- Quarantine any future experiments under `archive/` or `experiments/` with a status note.

## Guardrails
- Do not change public API paths (`/api/cards`, `/api/buckets`, `/api/simulate`, `/api/scan`, `/api/vine/order`, `/api/wallet/cherry-pass`).
- Do not move `prisma/schema.prisma`.
- Use `git mv` for any future relocations.
- Keep Next.js App Router conventions intact (`app/`).
