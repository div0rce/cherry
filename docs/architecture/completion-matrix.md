Status: Active
Last updated: 2026-10-17

# Completion Matrix

The single record of release readiness. Every row cites its evidence and labels the evidence's environment:
- **local-dev:** `next dev`, local Postgres, Prisma not mocked.
- **local-prod:** `next build` + `next start` on localhost.
- **mocked:** test suite with Prisma mocked.
- **CI:** GitHub Actions.
- **prod:** a Vercel deployment.

No row has prod evidence yet. Audiences, journeys, and rules come only from the cited docs.

Status values:
- `done`: verified, with evidence.
- `partial`: some criteria verified, others open.
- `blocked`: needs the owner or an external service.
- `open`: not started.
- `n/a`: not applicable at this stage.

## 1. Audiences and access
| Audience (source) | Gate | Acceptance | Evidence | Status |
| --- | --- | --- | --- | --- |
| Signed-out visitor (`docs/routes-map.md`) | `/` landing; user pages redirect to `/signin` | Can learn what Cherry is and reach sign-in | local-dev browser: landing → Get started → `/signin`; local-prod: `/app` 307 (#48, #50) | done |
| Signed-in user (`docs/routes-map.md`) | `requireUserContext` per page; APIs `resolveUserContext` | Only own data; 401 JSON when signed out | local-prod: `/api/cards` 401; mocked: user-isolation tests (#36, #42); local-dev: own buckets only | partial: route-auth normalization (audit item 4) open |
| Dev/admin (`docs/shell-architecture.md`) | `proxy.ts`, 403 in production unless `CHERRY_DEV_SHELL_ENABLED` | Every `(dev)` page gated | local-prod: 11 paths return 403; `tests/node/dev-shell-gate.test.ts` (#48) | done. Role gating beyond the env flag is an owner decision (`docs/auth.md:68`) |
| Lab/demo mode (`docs/auth.md:19`) | dev only | Not reachable in production | local-dev: `/app` renders signed-out (demo user); local-prod: redirect | done |

## 2. Lifecycle states (none documented; derived only from implemented prereqs)
| State | Where | Acceptance | Evidence | Status |
| --- | --- | --- | --- | --- |
| New, no setup | Home | Told what is missing; one CTA to setup | local-dev: "Finish setting up Cherry" (#49) | done |
| Partly set up (interrupted) | Home, onboarding hub | Resume from where they stopped | local-dev: Home shows "Continue setup"; the hub highlights the missing step | done |
| Ready | Home | One primary action | local-dev: "Ready when you are" → Plan a purchase | done |
| Returning, signed out | `/signin` → `callbackUrl` | Lands on the requested page | #37; mocked tests | done |

## 3. Journeys
| Journey | Steps | Acceptance | Evidence | Status |
| --- | --- | --- | --- | --- |
| Discovery → signup | `/` → `/signin` → account created on first sign-in | Continuous, no dead ends | local-dev browser (#50) | done (prod providers unverified: C) |
| Onboarding | card → reward rule → bucket | Each step saves, validates, recovers | local-dev: all three saved; rate 0 gives an alert; bucket create/edit crashed before #49 | done |
| Plan a purchase (core) | amount + merchant → recommendation | Useful recommendation | local-dev: a result renders, but with a credit card every option is excluded ("credit liability could not be fully resolved") | **blocked**: liability linkage (backlog item 30) is needed for a first useful outcome with credit cards |
| Buckets | list, edit | Real data, empty and error states | local-dev (#49) | done |
| History | saved sessions | Accurate | local-dev: empty state accurate; Autopilot previews are not saved (by spec) | done. Users have no path that creates a session (`/scan` is dev-gated; promoting it is an owner decision) |
| Account | sign out | Works | local-dev (#49) | done |
| Account deletion and data export | — | — | not implemented, not documented | **owner decision** (privacy/retention, backlog item 38) |
| Email-link sign-in | request link → check email | Confirmation shown | code + mocked; no SMTP locally | partial: needs one real send on preview (C) |
| Cherry Pass (Wallet) | flag + Apple certs | 501 unless enabled | #34; mocked | n/a until the owner enables it |

## 4. Website
| Item | Acceptance | Evidence | Status |
| --- | --- | --- | --- |
| What, who, how, limitations | Claims match behavior | `app/page.tsx` (#50); conflicts listed in `docs/marketing-hero-spec.md` | done |
| Navigation and CTA | Sign in + Get started | local-dev | done |
| Terms, privacy policy | Published and linked | none exist | **blocked**: owner/legal content |
| Support contact | Published | none documented | **blocked**: owner |
| Responsive | 375 px and 1280 px | local-dev screenshots | done |

## 5. UI quality
| Item | Evidence | Status |
| --- | --- | --- |
| Loading, empty, error, retry states | `(user)/loading.tsx`, `LoadError`, `error.tsx`, `not-found.tsx` (#49) | done |
| Labels, alerts, nav semantics, skip link | browser accessibility tree (#49) | done |
| Contrast: link colors were overridden globally | fixed (#49) | done; no automated contrast audit run |
| Dead controls and placeholders | Autopilot buttons and fake 30/50/20 removed (#49) | done |

## 6. Correctness and security
| Item | Evidence | Status |
| --- | --- | --- |
| Dev pages open in production | #48 | done |
| Production config 500s, 401s, 5xx redaction, cron secret, future-date wipe, session race, PII in logs | #35, #36, #38, #43, #44 | done (CI, mocked, local-prod) |
| Route auth normalization + guardrail (audit item 4) | — | open |
| Real bank CSV in git history | runbook in #32 | **blocked**: owner authorization (history rewrite) |
| `AUTH_SECRET` missing from env contract | runbook in #32 | done: `.env.example` and `check:env-contract` (#52) |

## 7. Dependencies
| Item | Evidence | Status |
| --- | --- | --- |
| ~95 of 98 Dependabot alerts fixed by the stack | #33; agent sweep | done once merged |
| esbuild (via tsx), csv-parse | #51 | done |
| @simplewebauthn/server 9 (alerts #99, #100) | `@auth/core` peer pins `^9`; WebAuthn is never configured, so the code path is unused | **owner decision**: dismiss as not reachable, or wait for Auth.js |
| node-forge, passkit-generator (npm audit) | no fix published | watch |
| Dev tooling highs (eslint-config-next, patch-package, prisma CLI) | major-only fixes | open: major upgrades |
| Dependabot config | `.github/dependabot.yml` (#51) | done |
| Superseded Dependabot PRs #24–#28 | — | close after merge |

## 8. Code health (CodeScene, fresh analysis 2026-10-17)
295 production files: 137 at 10, 67 at 9.0–9.9, 40 below 9, 51 not scorable (type-only modules). The lowest are `lib/engine/objective.ts` (6.02), `lib/autopilot/service.ts` (6.81), `lib/buckets/regimes.ts` (6.89), and `lib/accounting/ledger.ts` (6.98).
Status: **open**. Engine files need behavior-identical refactors under the engine-freeze protocol.

## 9. Operations
| Item | Evidence | Status |
| --- | --- | --- |
| Deployment config | `vercel.json`, runbook §1 in #32 | partial: env not verified on Vercel (C) |
| Migrations | none in the stack; `prisma migrate status` step in the runbook | done (local DB migrated cleanly) |
| Diagnostics | `/api/health`; error digests; `[cherry] server config init failed` log | partial: no monitoring/alerting service configured (owner) |
| Recovery | runbook | partial |

## Owner decisions (consolidated)
1. Merge the stack (#32–#51).
2. Bank CSV history purge.
3. Terms, privacy policy, support contact content.
4. Hero-spec claims ("automatically", "zero setup", pricing "free", proof points).
5. Credit liability linkage (backlog item 30), or accept "no recommendation" for credit cards.
6. Promote `/scan` to users (copy review).
7. Account deletion and data export policy.
8. Admin role gating beyond the env flag.
9. Duplicate CI test pass (guardrail change).
10. Dismiss the @simplewebauthn alerts as not reachable.
11. Vercel sign-in or bypass token for preview checks; set `AUTH_SECRET` and the other env vars.
