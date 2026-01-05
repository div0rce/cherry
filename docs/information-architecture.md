Status: Active
Last updated: 2026-01-03

# Information Architecture

## Overview
Cherry’s surfaces are intentionally split into three buckets so marketing, product, and dev work do not collide. This file is the source of truth for what lives where and must stay aligned with `docs/cherry-vision.md`, `docs/legal-constraints.md`, `docs/repo-structure.md`, and `docs/routes-map.md`.

**Audit status:** As of 2026-01-03, routes under `app/` are grouped under `(user)` and `(dev)`; `(marketing)` has no implemented pages yet. `/signin` remains a shared auth entry.
**Owner meaning:** Intended reviewer/maintainer for that route group; use CODEOWNERS when present.

## Current behavior (in repo today)
- Routes live under `app/(user)` and `app/(dev)` groups with `/signin` at the root.
- Marketing surfaces are planned but not implemented yet.

## Surfaces

### Marketing (app/(marketing)/*)
- **Purpose:** Acquisition storytelling, proof-first hero, and CTA to sign in.
- **Example routes:** none implemented yet.
- **Owner:** Growth/Product.

### User App (app/(user)/*)
- **Purpose:** End-user advisory surfaces: Autopilot, spend history, buckets, and card context.
- **Example routes:** `/app`, `/app/autopilot`, `/buckets`, `/history`, and the shared auth entry at `/signin`.
- **Owner:** Product.

### Dev Console / Lab (app/(dev)/*)
- **Purpose:** Simulations, engine introspection, ingest tooling, and admin utilities that are never user-facing.
- **Example routes:** `/dev` (console home), `/scan`, `/simulate`, `/sessions` (+ `/sessions/[id]`), `/simulations` (+ `/simulations/[simulationId]`), `/activity`, `/dev/buckets`, `/dev/history`, `/dev/statements` (+ `/dev/statements/[statementId]`), `/dev/cards` (+ `/dev/cards/[cardId]`), `/dev/engine/inspector`, `/dev/engine/guardrails`, `/dev/ingest`, `/dev/bank`, `/dev/evaluator`, `/vine-simulator`, `/bank-simulator`, and `/admin`.
- **Owner:** Devtools/Infra.

## Grouping rule (authoritative)
- Any route under `app/(dev)` must be gated by dev middleware.
- Any route under `app/(user)` must not import dev-only modules or expose dev tooling.
- `app/(marketing)` must not import auth-required server actions.

## Forbidden patterns
- No dev/simulator/admin tools under `(user)` unless explicitly documented as user-facing.
- No user-facing consumer flows under `(dev)`; dev console routes remain gated and labeled as such.
- No marketing or growth surfaces inside `(dev)` or `(user)`.
- No new top-level surface segments outside `(marketing)`, `(user)`, or `(dev)` without updating this document and `docs/routes-map.md` first.

## Extending the IA
- Additions or major reshapes require updating this file and `docs/routes-map.md` before implementation.
- Place new routes under the correct group (`(marketing)`, `(user)`, `(dev)`) and update navigation components that link to them.
- Cross-check legal guardrails in `docs/legal-constraints.md` and product identity in `docs/cherry-vision.md` whenever surfaces change.

## Future/Target behavior (explicitly speculative)
- Implement marketing routes under `app/(marketing)` with a clear CTA to `/signin`.
- Decide on `/autopilot`, `/cards`, and legacy `/home/*` aliases and implement or remove them from `lib/routes.ts`.

## Related docs
- `docs/routes-map.md`
- `docs/repo-structure.md`
- `docs/cherry-vision.md`
