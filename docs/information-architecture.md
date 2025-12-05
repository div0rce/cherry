Status: Active
Last updated: 2025-12-05

# Information Architecture

## Overview
Cherry’s surfaces are intentionally split into three buckets so marketing, product, and dev work do not collide. This file is the source of truth for what lives where and must stay aligned with `docs/cherry-vision.md`, `docs/legal-constraints.md`, `docs/repo-structure.md`, and `docs/routes-map.md`.

**Audit status:** As of 2025-12-05, all routes under `app/` have been audited and placed under `(marketing)`, `(user)`, or `(dev)` according to this IA (with `/signin` kept at the root as a shared auth entry).

## Surfaces

### Marketing (app/(marketing)/*)
- **Purpose:** Acquisition storytelling, proof-first hero, and CTA to sign in.
- **Example routes:** `/` (marketing landing/hero).
- **Owner:** Growth/Product.

### User App (app/(user)/*)
- **Purpose:** End-user advisory surfaces: Autopilot, spend history, buckets, and card context.
- **Example routes:** `/app` (Autopilot home), `/autopilot` (redirect to `/app`), `/buckets`, `/cards`, `/history`, legacy previews at `/home/buckets` and `/home/history`, and the shared auth entry at `/signin`.
- **Owner:** Product.

### Dev Console / Lab (app/(dev)/*)
- **Purpose:** Simulations, engine introspection, ingest tooling, and admin utilities that are never user-facing.
- **Example routes:** `/dev` (console home), `/scan`, `/simulate`, `/sessions` (+ `/sessions/[id]`), `/simulations` (+ `/simulations/[simulationId]`), `/activity`, `/dev/buckets`, `/dev/history`, `/dev/statements` (+ `/dev/statements/[statementId]`), `/dev/cards` (+ `/dev/cards/[cardId]`), `/dev/engine/inspector`, `/dev/engine/guardrails`, `/dev/ingest`, `/dev/bank`, `/dev/evaluator`, `/vine-simulator`, `/bank-simulator`, and `/admin`.
- **Owner:** Devtools/Infra.

## Forbidden patterns
- No dev/simulator/admin tools under `(user)` unless explicitly documented as user-facing.
- No user-facing consumer flows under `(dev)`; dev console routes remain gated and labeled as such.
- No marketing or growth surfaces inside `(dev)` or `(user)`.
- No new top-level surface segments outside `(marketing)`, `(user)`, or `(dev)` without updating this document and `docs/routes-map.md` first.

## Extending the IA
- Additions or major reshapes require updating this file and `docs/routes-map.md` before implementation.
- Place new routes under the correct group (`(marketing)`, `(user)`, `(dev)`) and update navigation components that link to them.
- Cross-check legal guardrails in `docs/legal-constraints.md` and product identity in `docs/cherry-vision.md` whenever surfaces change.
