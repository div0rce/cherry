Status: Active
Last updated: 2026-01-02

# Routes Map

Canonical map of key routes, aligned to `docs/information-architecture.md`. Current behavior is derived from App Router pages under `app/`.

## Current behavior (enforced / in code)

| Path | Surface | Purpose | Owner | Notes |
| --- | --- | --- | --- | --- |
| /signin | User | Auth entry for user + dev shells | Auth/Product | Shared sign-in at root; do not bypass NextAuth. |
| /app | User | User shell for advisory entry | Product | Primary user shell. |
| /app/onboarding | User | Onboarding hub | Product | Buckets/cards creation flows. |
| /app/onboarding/buckets/new | User | New bucket flow | Product |  |
| /app/onboarding/buckets/[bucketId]/edit | User | Edit bucket | Product |  |
| /app/onboarding/cards/new | User | New card flow | Product |  |
| /app/onboarding/cards/[cardId]/edit | User | Edit card | Product |  |
| /app/onboarding/cards/[cardId]/rules/new | User | New reward rule | Product |  |
| /app/onboarding/cards/[cardId]/rules/[ruleId]/edit | User | Edit reward rule | Product |  |
| /app/autopilot | User | Autopilot detail surface | Product | Lives under `/app`. |
| /buckets | User | Buckets overview | Product | User shell outside `/app`. |
| /history | User | Spend history timeline | Product |  |
| /dev | Dev | Dev console dashboard | Devtools/Infra | Dev-only shell, gated by middleware. |
| /dev/buckets | Dev | Buckets management with diagnostics | Devtools/Infra | Dev-only. |
| /dev/history | Dev | Spend history inspector | Devtools/Infra | Dev-only. |
| /dev/statements | Dev | Statement rollups | Devtools/Infra |  |
| /dev/statements/[statementId] | Dev | Statement detail | Devtools/Infra |  |
| /dev/cards | Dev | Card management and reward rules | Devtools/Infra |  |
| /dev/cards/[cardId] | Dev | Card detail and reward rules | Devtools/Infra |  |
| /dev/ingest | Dev | Ingest dashboard | Devtools/Infra | Dev-only. |
| /dev/bank | Dev | Bank ingest debug view | Devtools/Infra | Dev-only. |
| /dev/evaluator | Dev | Offline evaluator UI | Devtools/Infra | Dev-only; gated by env flag. |
| /dev/engine/inspector | Dev | Engine inspector | Devtools/Infra | Dev-only. |
| /dev/engine/guardrails | Dev | Engine guardrails view | Devtools/Infra | Dev-only. |
| /dev/activity | Dev | Unified activity inspector | Devtools/Infra | Dev-only. |
| /activity | Dev | Engine/ledger activity timeline | Devtools/Infra | Dev-only path outside `/dev`. |
| /scan | Dev | Manual advisory session runner | Devtools/Infra | Dev-only path outside `/dev`. |
| /simulate | Dev | Simulation runner | Devtools/Infra | Dev-only path outside `/dev`. |
| /simulations | Dev | Simulation history list | Devtools/Infra | Dev-only. |
| /simulations/[simulationId] | Dev | Simulation detail | Devtools/Infra | Dev-only. |
| /sessions | Dev | Recommendation sessions list | Devtools/Infra | Dev-only. |
| /sessions/[id] | Dev | Session detail with verdicts | Devtools/Infra | Dev-only. |
| /vine-simulator | Dev | Vine context simulator | Devtools/Infra | Hardware mock; dev-only. |
| /bank-simulator | Dev | Bank/Plaid simulator | Devtools/Infra | Dev-only ingest helper. |
| /admin | Dev | Admin and tooling | Devtools/Infra | Dev-only resets/seeds. |

## Future/Target behavior (explicitly speculative)
- `lib/routes.ts` declares marketing and legacy paths (`/`, `/autopilot`, `/cards`, `/home/*`) that are not implemented as pages; add real routes or adjust constants when those surfaces land.
- Marketing and public landing pages live under `app/(marketing)` when implemented.

## Related docs
- `docs/information-architecture.md`
- `docs/repo-structure.md`
- `docs/api.md`
- `lib/routes.ts`
