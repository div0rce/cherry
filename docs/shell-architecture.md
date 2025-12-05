Status: Active
Last updated: 2025-12-05

# Shell Architecture

Cherry runs two thin shells on one headless core.

## Headless core (shared)
- `lib/engine/*`, `lib/services/*`, `lib/user-context.ts`, `lib/buckets/*`, `lib/verification/*`.
- Business logic, ingest, guardrails, and solver live here. No React in these modules.

## User shell
- Routes: `app/(user)/**` (`/`, `/buckets`, `/history`).
- Allowed imports: shared UI (`components/ui/*`), headless services in `lib/**`.
- Forbidden: importing from `app/(dev)/**` or embedding business logic in components.

## Dev shell
- Routes: `app/(dev)/dev/**` (e.g., `/dev`, `/dev/buckets`, `/dev/engine/inspector`, `/dev/ingest`).
- Allowed imports: shared UI + headless services; may use dev-only helpers.
- Forbidden: importing from `app/(user)/**`.
- Access is gated by middleware; disabled in production unless `CHERRY_DEV_SHELL_ENABLED=true`.

## Enforcement
- Middleware (`middleware.ts`) gates `/dev` and `/api/dev/*`.
- Scripts:
  - `npm run check:dev-ui-parity` — all backend features must have a dev surface.
  - `npm run check:shell-boundaries` — blocks `(user) ↔ (dev)` imports.
  - `npm run check:guardrails` — guardrail config sanity.
- CI (`npm test`) runs parity, shell-boundary, and guardrail checks alongside tests.

## Rules
- No business logic in React components; keep it in `lib/**`.
- User shell never imports dev shell; dev shell never imports user shell.
- Dev shell must remain behind the middleware gate in prod.
