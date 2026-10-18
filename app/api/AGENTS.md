# app/api — scoped rules

Root contract: `../../AGENTS.md`. Flow traces: `../../docs/architecture/data-flow.md`. This file adds only route specifics.

## Shape of every handler
```ts
const { userId } = await resolveUserContext({ getSession: auth, requireAuth: true, allowLabDemo: false }); // or withUser(request, handler)
const parsed = await parseJsonBody(request, SomeSchema);   // schema from lib/schemas/*
if (parsed.ok !== true) return parsed.response;
const now = new Date(); const nowMs = now.getTime(); const world = buildPrismaWorld();
const result = await someService(world, userId, parsed.data, { nowMs });   // one call into lib/
return NextResponse.json(result);
```
- Unauthenticated stateful requests return 401. `allowLabDemo: true` is only for advisory dev surfaces (`/api/scan`).
- No decision logic inline; engine decisions only via `safeSolveDecisionForWorld` (`lib/engine/run.ts`).
- Time and randomness are created here and passed down. `process.env` reads are allowed only in `app/api/**` and `scripts/**` and should go through `lib/config` (`check:config`).
- A route file is owned by its service domain (`scripts/guardrails/domains.manifest.json`); it may import only what that domain may import. New route directory: add it to the owning domain's `owns`.
- Dev-only routes live under `app/api/dev/**` and are gated by `proxy.ts` (`/api/dev/:path*`). `app/api/internal/**` is for cron-style entry points.
- New public endpoint: update `docs/api.md` and add a `tests/next/api-<name>.*.test.*`.

## Semantics that must not drift
- `/api/scan` writes only `DecisionEvent`. No session, ledger, or bucket mutation.
- `/api/sessions` creates; `[id]/confirm` increments `Bucket.spentCents` once and writes PENDING ledger rows; `[id]/verify` moves rows to POSTED/REVOKED. No other route touches `CherryPointLedger`.
- `/api/vine/order` is dev-only, context-only; signature mode from config, 3-minute freshness window.
- `/api/wallet/cherry-pass` returns 501 unless fully configured and enabled.
