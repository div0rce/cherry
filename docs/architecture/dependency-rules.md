Status: Active
Last updated: 2026-10-17

# Dependency Rules

## The rule
Imports flow downward only:

```
surface (ui, dev-tools)
   ↓
service (sessions, evaluation, autopilot, vine, wallet, buckets, cards, bank, income, daily-state, evaluator, identity, observability)
   ↓
runtime (adapters-runtime, persistence)
   ↓
core (engine, authority, accounting, adapters-contracts, schemas, config, shared)
```

- A domain may value-import only itself and the domains listed in its `mayImport` in `scripts/guardrails/domains.manifest.json`. Surfaces list `"*"`.
- Core domains never import runtime or services. `engine` and `authority` additionally never import Prisma or read the clock (`check:engine-prisma`, `check:engine-date`); time enters as `nowMs` from the route.
- `persistence` (`lib/prisma.ts`) is the only place a Prisma client is created. Services may import it directly today; the target is to reach Prisma through `adapters-runtime` stores, but that migration is not enforced.
- Type-only imports (`import type`, `export type ... from`) are not checked. They create no runtime coupling. Do not launder a value dependency through a type import. An inline modifier (`import { type Foo } from './x.js'`) is checked: with `verbatimModuleSyntax` it compiles to `import {} from './x.js'`, which still loads the module.
- `app/api/**/route.ts` files belong to the service that owns the route, so a route may import only what its service may import. Keep handlers thin: auth, `parseJsonBody`, one service call, response.
- Guardrail scripts (the `check:<name>` scripts under `scripts/`) may not import `lib/**` (`check:environment-import-integrity`, with a small explicit allowlist). They inspect source text.
- User shell must not import from the dev shell and vice versa (`check:shell-boundaries`).

## Enforcement
`check:domain-boundaries` (part of `npm run check`) fails when:
- a file under `lib/`, `app/`, `components/`, `types/` has no owner or two owners;
- a value import crosses domains outside `mayImport` and is not in `allowedViolations`;
- an `allowedViolations` entry no longer occurs (stale debt must be deleted);
- a domain's `docs` path or `tests` glob resolves to nothing.

Cross-domain edge counts: `CHERRY_DOMAIN_BOUNDARIES_REPORT=1 npm run check:domain-boundaries`.

## Adding or moving code
1. Put the file under a path an existing domain already owns, or add the path to that domain's `owns`.
2. If it needs a new cross-domain import, ask whether the dependency direction is right. If it is, add the target to `mayImport`. If it is not, move the shared piece down a layer (usually to `shared`, `schemas`, or `adapters-contracts`).
3. Never add to `allowedViolations` for new code. That list is for pre-existing debt only.

## Current allowlisted debt
Listed with reasons in `domains.manifest.json`. As of this writing:
- `lib/engine/legacy.ts` -> `lib/legacy-engine.ts` and `lib/engine/public.ts` -> `lib/engine-state.ts`: the engine barrel (`lib/engine.ts`) re-exports Prisma-backed runtime bridges, so importing the barrel loads Prisma. Removing this is an engine-freeze change (see `docs/doctrine.md` §1 and §8).
- `lib/engine/public.ts` -> `lib/scan-helpers.ts`: value cycle `lib/engine.ts` -> `engine/index` -> `engine/public` -> `scan-helpers` -> `lib/engine.ts`.
- `lib/authority/replayAuthority.ts` -> `lib/adapters/runtime/authority.replay.prisma.ts`: pure module re-exporting a runtime implementation; it has no importers.
- `lib/adapters/runtime/{authority,engine-state}.prisma.ts` -> `lib/buckets/periods.ts` and `lib/buckets-runtime.ts`, and `lib/adapters/runtime/legacy-engine.prisma.ts` -> `lib/buckets/periods.ts`: runtime loaders apply pure bucket math owned by the `buckets` service. Listed edge by edge so runtime cannot import any other service code. Retire by moving bucket math to a core domain.

Other known direction problems that the manifest currently tolerates by ownership choice rather than allowlist: `lib/auth.ts` imports `app/api/auth/[...nextauth]/route.ts` (both in `identity`), and `lib/autopilot/runSimulation.ts` type-imports `components/autopilot/*`.

## Related docs
- `index.md`, `domains.md`, `docs/doctrine.md` §2 (environment separation), `docs/adapters.md`
