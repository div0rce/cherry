Status: Active
Last updated: 2026-10-17

# Architecture Map

Entry point for anyone (human or agent) who needs to change Cherry. Read this, then the one domain page you need. Operating rules live in `AGENTS.md`; execution invariants in `docs/doctrine.md`.

## What Cherry is, in one paragraph
A Next.js 16 App Router app (React 19, TypeScript, Prisma/PostgreSQL, NextAuth, Zod) that runs a deterministic decision engine over a user's cards, buckets, and a merchant/amount context, recommends a card and budget impact, and rewards followed advice with advisory Cherry Points. The loop is Observe -> Evaluate -> Recommend -> Reward. Cherry never touches payment rails.

## System map

```
 surfaces   app/(user)  app/(dev)  components/         <- UI, dev console
            app/api/*/route.ts                         <- thin HTTP boundary: auth, Zod, call a service
 services   sessions  evaluation  autopilot  vine  wallet  buckets  cards  bank  income  daily-state  evaluator  identity  observability
 runtime    lib/adapters/runtime (World: Prisma stores, clock, entropy, logger)   lib/prisma.ts
 core       engine  authority  accounting  adapters-contracts  schemas  config  shared
```

Dependency direction is downward only. `scripts/guardrails/domains.manifest.json` is the machine-readable version of this map and `check:domain-boundaries` enforces it. See `dependency-rules.md`.

## Pages
- `domains.md` — every domain: what it owns, its entrypoints, its tests, its docs, its invariants. Start here to locate code.
- `dependency-rules.md` — what may import what, the type-only exception, and the current allowlisted debt.
- `data-flow.md` — scan, session create/confirm/verify, Vine order, Autopilot preview/commit, traced through the layers.
- `engine-rules.md` — engine-specific rules for agents: freeze, version bumps, purity, file map.
- `testing.md` — test layout, runners, the FAST / DOMAIN / FULL verification levels, and how to run one file.
- `completion-matrix.md` — release-readiness matrix: audiences, lifecycle states, journeys, website, security, dependencies, code health, operations, each with evidence and its environment; consolidated owner decisions.
- `decisions/` — architecture decision records.

## Finding the owner of a file
```bash
npm run report:domain-impact -- lib/buckets-runtime.ts      # domain, allowed imports, tests, docs, invariants
npm run report:domain-impact                                  # same for every file changed vs main
```

## Related docs
- `AGENTS.md`, `docs/doctrine.md`, `docs/legal-constraints.md`, `docs/cherry-vision.md`
- `docs/system-overview.md` (product-level narrative), `docs/api.md`, `docs/routes-map.md`
