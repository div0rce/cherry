Status: Active
Last updated: 2026-09-22

# Cherry Repository Structure

Where things live and where new code goes. Domain ownership (which capability owns which files) is in `docs/architecture/domains.md`; this page is the directory view.

## Current behavior (enforced / in code)
- App Router routes are grouped under `app/(dev)` and `app/(user)`, with API routes in `app/api` and the sign-in card in `app/signin`. There is no `app/(marketing)` group yet.
- Imports are relative with a `.js` extension; there is no `@/` path alias (`check:repo-guardrails` rejects it).
- Prisma is instantiated only in `lib/prisma.ts`.
- Scripts live under `scripts/` as `.mts` and run via `npm run ts:esm`; there is no `dist-scripts/` build output.

```
.
├─ app/              # Next.js App Router: (dev) console, (user) shell, api/ route handlers, layout/providers
├─ components/       # Shared UI (components/ui primitives, autopilot, simulations, layout, user)
├─ lib/              # Domain logic; see docs/architecture/domains.md for ownership
│  ├─ engine/        #   pure decision engine (core)
│  ├─ authority/, accounting/, adapters/{contracts,*.ts}, schemas/, config/   # core
│  ├─ adapters/runtime/, prisma.ts                                            # runtime
│  └─ sessions/, vine/, wallet/, autopilot/, buckets/, bank/, income/, evaluator/, ...  # services
├─ prisma/           # schema.prisma + migrations
├─ scripts/          # guardrails (check-*.mts, guardrails/), execution scripts (execution/), loaders (lib/)
├─ tests/            # node/ next/ db/ fixtures/ replay/ (+ legacy top-level copies, see docs/architecture/testing.md)
├─ data/             # MCC inputs, dev bank CSV fixture
├─ docs/             # architecture/ (start), doctrine, guardrails, product docs
├─ types/            # global d.ts and compat shims (types/compat/README.md)
├─ patches/          # patch-package patches (allowlisted in scripts/vendor-shims.allowlist.json)
├─ public/           # static assets
└─ proxy.ts          # dev-route gate (/dev/*, /api/dev/*)
```

## Conventions for new code
- API handlers stay thin; logic goes into the owning `lib/<domain>/` module. Add the route to that domain's `owns` in `scripts/guardrails/domains.manifest.json`.
- Validate with Zod schemas in `lib/schemas/*` via `parseJsonBody`.
- Server-first components; interactive parts in a sibling `client.tsx` with `'use client'`.
- New scripts: register in `scripts/execution/registry.mts` (see `scripts/AGENTS.md`).
- Use `git mv` when relocating files and update the manifest in the same change.
- Preserve public API paths unless intentionally versioned.

## Future/Target behavior (explicitly speculative)
- A marketing surface under `app/(marketing)` when it lands (`docs/information-architecture.md`).
- Services reach Prisma only through `lib/adapters/runtime` stores.

## Related docs
- `AGENTS.md`, `docs/architecture/index.md`, `docs/ci-and-guardrails.md`, `docs/information-architecture.md`
