Status: Active
Last updated: 2025-12-28

# Agent Run Summary

## Current behavior

- Phases covered: Phase 1 (route inventory + rot deletion), Phase 2 (design tokens + primitives), Phase 3 partial (Dev dashboard, Buckets, Spend History/Statements), Phase 6 minimal parity doc/script scaffold. Routing fix completed: dev console now lives at `/dev`, marketing landing owns `/`, user shell lives at `/app`.
- Routes/pages updated: dev dashboard now at `/dev` with Money routes at `/dev/buckets`, `/dev/history`, `/dev/statements`, shared dev layout/sidebar, plus supporting UI primitives. Phase 3 continuation: `/scan`, `/simulate`, `/activity`, `/sessions`, `/sessions/[id]`, `/vine-simulator`, `/admin` migrated to the Cherry design system with dev badges and unified panels.
- New artifacts: `docs/dev-route-inventory.md`, `docs/dev-ui-parity.md`, `check:dev-ui-parity`, and UI primitives in `components/ui`.
- Phase 4 (user shell): Added dark user layout/nav, Autopilot home at `/app` with new client + `/api/autopilot`, user buckets (`/buckets`) and spend history (`/history`) built on Cherry primitives, `/autopilot` now redirects to `/app`.
- Dev/user routing cleanup: moved dev buckets/history/statements under `/dev/*` to eliminate parallel route conflicts with the new user shell; sidebar links updated accordingly.
- Phase 4 finalization: user pages now use user-friendly copy, sanitized outputs (no engine/internal fields), consistent PageHeader descriptions, and Cherry primitives for empty/error/loading states; Autopilot output is limited to card name + rationale.
- Phase 6 (dev parity): Added engine inspector `/dev/engine/inspector`, guardrail monitor `/dev/engine/guardrails`, ingest dashboard `/dev/ingest`, and invariants panel on `/admin`; all parity rows now implemented and `check:dev-ui-parity` enforced in test flow.
- Phase 7 (shell separation): Added middleware gate for `/dev` and `/api/dev/*`, shell boundary check script (`check:shell-boundaries`) wired into tests, and documented shell architecture; user/dev shells cannot import each other.
- Phase 8 (Autopilot-first UX): User nav reduced to Autopilot/Buckets/Cards (history removed from nav); Autopilot is a single-input/output/confirm flow with reinforcement; buckets page simplified for visibility; new user-facing cards list for reference.
- Routing guardrails follow-up: Dev cards moved under `/dev/cards` (with detail/new routes) to avoid collisions with user cards; added `check:route-collisions` (CI-enforced) to catch parallel pages ignoring route groups.
- Known gaps: Guardrail-level visibility is limited to static catalog and empty recent events; user shell still minimal; dev evaluators/secondary inspectors still follow old layouts and are out of scope for this pass.

## Future/Target behavior

- TODO: Capture remaining phases once the evaluator and secondary inspectors are ported.
