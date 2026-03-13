Status: Active
Last updated: 2026-01-02

# Auth Architecture (NextAuth + Prisma)

This document explains how authentication works in Cherry and how to keep it aligned with the product guardrails (`docs/legal-constraints.md`, `docs/cherry-vision.md`). It must stay consistent with `AGENTS.md`.

---

## Overview
- Identity/auth stack: **NextAuth** with **PrismaAdapter**.
- Location: `app/api/auth/[...nextauth]/route.ts`.
- Storage: `User`, `Account`, `Session`, `VerificationToken` tables in `prisma/schema.prisma`.
- Session guard: `withUser` (`lib/with-user.ts`) extracts `userId` via `getServerSession` and returns `401` on failure.
- Client handling: components use `useSession()` and call `signIn()` on `401` responses from APIs.

## Current behavior (enforced / in code)
- Stateful routes use `withUser` or `resolveUserContext` to require auth and supply `userId`.
- `/api/scan` allows lab demo access (`requireAuth: false`) but still resolves user context when possible.

## Providers and Env
- Supported providers today:
  - **Email** (`EMAIL_SERVER`, `EMAIL_FROM`)
  - **Google OAuth** (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
  - **Dev Credentials** (non-production only; creates/fetches user by email, no secrets required)
- Add providers by importing from `next-auth/providers/*` inside `authOptions.providers`.
- Keep secrets out of tracked files and supply them via exported environment or deployment configuration. `.env.example` is the documented contract; see `docs/env-policy.md`.

## Session Lifecycle
1. User signs in via `/signin` or `signIn()` (client).
2. NextAuth issues a session token; PrismaAdapter persists `User` + `Account` + `Session`.
3. `session` callback stamps `session.user.id`.
4. API routes call `withUser(request, handler)` → loads session → supplies `userId` → 401 if absent.
5. UI reacts to 401 by prompting sign-in (never silently fails).

## Protected Surfaces
- Auth is required for stateful APIs (via `withUser` or `resolveUserContext`), including:
  - `/api/sessions`, `/api/sessions/[id]`, `/api/sessions/[id]/confirm`, `/api/sessions/[id]/verify`
  - `/api/vine/order`
  - `/api/cards`, `/api/cards/[cardId]`, `/api/cards/[cardId]/rewards`
  - `/api/buckets`, `/api/buckets/[bucketId]`
  - `/api/simulate`, `/api/simulations`, `/api/activity`
  - `/api/autopilot/*`
  - Admin/dev utilities (`/api/admin/*`, `/api/seed-demo`, `/api/dev/*`, `/api/internal/*`)
- Advisory `/api/scan` resolves user context but allows lab/demo access.
- `/api/health` is open by design.
- `/api/admin/health` requires authenticated dev/admin access.
- UI pages calling protected endpoints must wrap in `useSession()` and redirect/prompt on unauthenticated states (`/signin?callbackUrl=...`).

## Error Handling and UX Rules
- Never let `401` bubble as a generic error. In client components, if `res.status === 401`, call `signIn()` or show a CTA.
- In server components, redirect to `/signin` with `callbackUrl` for the requested page.
- The `/signin` page should clearly state that Cherry is a spending copilot (not a card) and link to legal/privacy if exposed to users.

## Testing Auth
- CLI: use `./scripts/dev-login.sh [email]` to create `cookies.txt`, then pass `-b cookies.txt` to curl.
- Browser: hit `/signin`, complete provider flow, then exercise APIs via UI or Dev Console.
- After schema changes, run `npx prisma migrate dev` and `npx prisma generate` so NextAuth tables stay in sync.

## Do / Don’t
- **Do** enforce auth via `withUser` for every stateful API.
- **Do** keep session callbacks stamping `session.user.id`.
- **Do** handle `401` intentionally in UI.
- **Don’t** read cookies manually or create ad-hoc Prisma clients.
- **Don’t** reintroduce destructive admin HTTP routes guarded only by ordinary user auth.

## Future/Target behavior (explicitly speculative)
- Add stricter role gating for admin/dev utilities before any production exposure.

## Related docs
- `AGENTS.md`
- `docs/ci-and-guardrails.md`
- `docs/env-policy.md`
- `docs/legal-constraints.md`
