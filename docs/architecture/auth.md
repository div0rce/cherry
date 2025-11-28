# Auth Architecture (NextAuth + Prisma)

Status: **Active**. This document explains how authentication works in Cherry and how to keep it aligned with the product guardrails (copilot, not a card). It must stay consistent with `AGENTS.md` and `docs/cherry-vision.md`.

---

## Overview
- Identity/auth stack: **NextAuth** with **PrismaAdapter**.
- Location: `app/api/auth/[...nextauth]/route.ts`.
- Storage: `User`, `Account`, `Session`, `VerificationToken` tables in `prisma/schema.prisma`.
- Session guard: `withUser` (`lib/with-user.ts`) extracts `userId` via `getServerSession` and returns `401` on failure.
- Client handling: components use `useSession()` and call `signIn()` on `401` responses from APIs.

---

## Providers and Env
- Supported providers today: Credentials + Google (extendable).
- Add providers by importing from `next-auth/providers/*` inside `authOptions.providers`.
- Required env vars (example for Google):
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- Keep secrets in `.env.local` (never committed).

---

## Session Lifecycle
1) User signs in via `/signin` or `signIn()` (client).
2) NextAuth issues a session token; PrismaAdapter persists `User` + `Account` + `Session`.
3) `session` callback stamps `session.user.id`.
4) API routes call `withUser(request, handler)` → loads session → supplies `userId` → 401 if absent.
5) UI reacts to 401 by prompting sign-in (never silently fails).

---

## Protected Surfaces
- All business APIs in `app/api/*` expect auth:
  - `/api/scan` (advisory)
  - `/api/sessions`, `/api/sessions/[id]/confirm|verify`
  - `/api/vine/order`
  - `/api/cards`, `/api/buckets`, `/api/simulate`
  - Admin utilities under `/api/admin/*`, `/api/seed-demo`
- UI pages that call these endpoints must wrap in `useSession()` and redirect/prompt on unauthenticated states (`/signin?callbackUrl=...`).

---

## Error Handling and UX Rules
- Never let `401` bubble as a generic error. In client components, if `res.status === 401`, call `signIn()` or show a CTA.
- In server components, redirect to `/signin` with `callbackUrl` for the requested page.
- The `/signin` page should clearly state that Cherry is a spending copilot (not a card) and link to privacy/terms if exposed to users.

---

## Testing Auth
- CLI: use `./scripts/dev-login.sh [email]` to create `cookies.txt`, then pass `-b cookies.txt` to curl.
- Browser: hit `/signin`, complete provider flow, then exercise APIs via UI or Dev Console.
- After schema changes, run `npx prisma migrate dev` and `npx prisma generate` so NextAuth tables stay in sync with the client.

---

## Do / Don’t
- **Do** enforce auth via `withUser` for every stateful API.
- **Do** keep session callbacks stamping `session.user.id`.
- **Do** handle `401` intentionally in UI.
- **Don’t** read cookies manually or create ad-hoc Prisma clients.
- **Don’t** weaken auth on admin tools; they are local-only and should stay guarded.
