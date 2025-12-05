Status: Active
Last updated: 2025-12-05

# Routes Map

Canonical map of key routes, aligned to `docs/information-architecture.md`. Use this table when adding or relocating pages so marketing, user, and dev surfaces stay separated.

| Path | Surface | Purpose | Owner | Notes |
| --- | --- | --- | --- | --- |
| / | Marketing | Marketing landing/hero | Growth/Product | CTA to `/signin`. |
| /signin | User | Auth entry for user + dev shells | Auth/Product | Shared sign-in; do not bypass NextAuth. |
| /app | User | Autopilot home (manual advisory) | Product | Primary user shell. |
| /autopilot | User | Alias redirect to `/app` | Product | Legacy compatibility. |
| /buckets | User | Buckets overview and controls | Product | Equivalent to `/app/buckets`. |
| /cards | User | Card reference list | Product | Equivalent to `/app/cards`; chosen by Autopilot. |
| /history | User | Spend history timeline | Product | Covers `/app/history`; legacy `/home/history` exists. |
| /home/buckets | User | Legacy buckets preview | Product | Keep until fully removed from UX. |
| /home/history | User | Legacy history preview | Product | Keep until fully removed from UX. |
| /dev | Dev | Dev console dashboard | Devtools/Infra | Dev-only shell. |
| /dev/buckets | Dev | Buckets management with diagnostics | Devtools/Infra | Dev-only. |
| /dev/history | Dev | Spend history inspector | Devtools/Infra | Dev-only. |
| /dev/statements | Dev | Statement rollups | Devtools/Infra | Detail at `/dev/statements/[statementId]`. |
| /dev/cards | Dev | Card management and reward rules | Devtools/Infra | Detail at `/dev/cards/[cardId]`. |
| /activity | Dev | Engine/ledger activity timeline | Devtools/Infra | Dev-only path (lives under `(dev)`). |
| /scan | Dev | Manual advisory session runner | Devtools/Infra | Dev-only path (lives under `(dev)`). |
| /simulate | Dev | Simulation runner | Devtools/Infra | Dev-only path (lives under `(dev)`). |
| /simulations | Dev | Simulation history list | Devtools/Infra | Detail at `/simulations/[simulationId]`. |
| /sessions | Dev | Recommendation sessions list | Devtools/Infra | Detail at `/sessions/[id]`. |
| /vine-simulator | Dev | Vine context simulator | Devtools/Infra | Hardware mock; dev-only. |
| /bank-simulator | Dev | Bank/Plaid simulator | Devtools/Infra | Dev-only ingest helper. |
| /dev/ingest | Dev | Ingest dashboard | Devtools/Infra | Dev-only. |
| /dev/bank | Dev | Bank ingest debug view | Devtools/Infra | Dev-only. |
| /dev/evaluator | Dev | Offline evaluator UI | Devtools/Infra | Dev-only; gated by env flag. |
| /dev/engine/inspector | Dev | Engine inspector | Devtools/Infra | Dev-only. |
| /dev/engine/guardrails | Dev | Engine guardrails view | Devtools/Infra | Dev-only. |
| /dev/activity | Dev | Unified activity inspector | Devtools/Infra | Dev-only. |
| /admin | Dev | Admin and tooling | Devtools/Infra | Dev-only resets/seeds. |
