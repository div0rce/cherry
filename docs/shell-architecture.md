Status: Active
Last updated: 2026-01-02

# Shell Architecture

Cherry runs two thin shells on one headless core.

## Current behavior (enforced / in code)

### Headless core (shared)
- `lib/engine/*`, `lib/services/*`, `lib/user-context.ts`, `lib/buckets/*`, `lib/verification/*`.
- Business logic, ingest, guardrails, and solver live here. No React in these modules.

### User shell
- Routes: `app/(user)/**` (`/app`, `/buckets`, `/history`).
- Allowed imports: shared UI (`components/ui/*`), headless services in `lib/**`.
- Forbidden: importing from `app/(dev)/**` or embedding business logic in components.

### Dev shell
- Routes: `app/(dev)/dev/**` (e.g., `/dev`, `/dev/buckets`, `/dev/engine/inspector`, `/dev/ingest`).
- Allowed imports: shared UI + headless services; may use dev-only helpers.
- Forbidden: importing from `app/(user)/**`.
- Access is gated by middleware; disabled in production unless `CHERRY_DEV_SHELL_ENABLED=true`.

### Enforcement
- Proxy (`proxy.ts`) gates `/dev` and `/api/dev/*`.
- Scripts:
  - `check:dev-ui-parity` — all backend features must have a dev surface.
  - `check:shell-boundaries` — blocks `(user) ↔ (dev)` imports.
  - `check:guardrails` — guardrail config sanity.
- CI (`test`) runs parity, shell-boundary, and guardrail checks alongside tests.

### Rules
- No business logic in React components; keep it in `lib/**`.
- User shell never imports dev shell; dev shell never imports user shell.
- Dev shell must remain behind the middleware gate in prod.

## Future/Target behavior

- TODO: Extend shell enforcement when new route groups or shells are introduced.

## Related docs
- `docs/repo-structure.md`
- `docs/routes-map.md`
- `docs/ci-and-guardrails.md`
