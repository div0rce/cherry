Status: Active
Last updated: 2025-12-04

# Dev Route Inventory

Policy: `(user)` routes are user-facing only; `(dev)` routes are dev console only and gated (`/dev/*`), never exposed to end users.

| Route path | Classification | Notes |
|------------|----------------|-------|
| / | Marketing | Marketing hero landing (proof-first, single CTA). |
| /app | User-relevant | User shell home with Autopilot; Dev console now lives at /dev. |
| /dev | Dev-only | Dev console dashboard (moved from root to avoid parallel route conflict). |
| /autopilot | User-relevant | Alias redirect to /app (kept for compatibility). |
| /home/buckets | Obsolete | Legacy buckets preview, superseded by /buckets. |
| /home/history | Obsolete | Legacy history preview, superseded by /history. |
| /signin | User-relevant | Auth entry for both shells. |
| /buckets | User-relevant | User buckets overview (minimal; reinforcement only). |
| /buckets/new | Obsolete | Duplicate of create bucket panel on /buckets; not linked. |
| /cards | User-relevant | User-facing card list (reference only; chosen by Autopilot). |
| /cards/[cardId] | Obsolete | Dev card detail relocated under /dev/cards/[cardId] to avoid collisions. |
| /cards/new | Obsolete | Dev card creation relocated under /dev/cards/new to avoid collisions. |
| /history | User-relevant (secondary) | Basic history (de-emphasized; not in nav). |
| /dev/buckets | Dev-only | Dev buckets moved from /buckets to avoid user-shell collision. |
| /dev/history | Dev-only | Dev spend history moved from /history to avoid collision. |
| /dev/statements | Dev-only | Statement rollups (dev-only) moved under /dev/statements. |
| /dev/statements/[statementId] | Dev-only | Dev statement inspector relocated under /dev/statements to avoid conflicts. |
| /dev/cards | Dev-only | Dev card management moved from /cards to avoid user-shell collisions. |
| /dev/cards/[cardId] | Dev-only | Dev card detail + reward rules now under /dev/cards to avoid collisions. |
| /dev/cards/new | Dev-only | Dev add-card flow relocated under /dev/cards/new. |
| /activity | Dev-only | Engine/ledger activity timeline; migrated to Cherry design system with dev badge. |
| /scan | Dev-only | Manual advisory surface that creates sessions; restyled with Cherry primitives. |
| /simulate | Dev-only | Simulation runner for engine evaluation; design-system aligned. |
| /simulations | Dev-only | Simulation history list. |
| /simulations/[simulationId] | Dev-only | Simulation detail view. |
| /sessions | Dev-only | Recommendation sessions list with engine context; design-system aligned. |
| /sessions/[id] | Dev-only | Session detail with engine verdicts; design-system aligned. |
| /vine-simulator | Dev-only | Vine context simulator (dev hardware mock); design-system aligned. |
| /admin | Dev-only | Admin tools/seeds/reset actions; consolidated into design-system panels. |
| /bank-simulator | Dev-only | Bank/Plaid simulator input for ingest. |
| /dev/activity | Dev-only | Unified activity inspector (diagnostic). |
| /dev/bank | Dev-only | Bank ingest debug table for current user. |
| /dev/evaluator | Dev-only | Offline evaluator surface. |
