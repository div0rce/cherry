# Repository Guidelines

## Product Identity & Guardrails
- Cherry is a real-time spending advisor, not a payment card or proxy. It does not front or route transactions, hold funds, or touch payment rails.
- Core loop: **Observe → Evaluate → Recommend → Reward**. Cherry observes context (merchant/amount/user data), evaluates budgets + rewards, recommends a card/decision, and can reward users for following advice.
- Cherry Pass and pre-swipe scans are advisory surfaces only; Wallet pass endpoint currently returns 501 until certs are configured.
- Cherry Vine (hardware) is a context beacon: on-counter node that hears order metadata (merchant, amount, timestamp) and broadcasts to phones via BLE/NFC. It never reads card data, speaks EMV, or acts as a payment terminal.
- Recommendation sessions and Cherry Points are advisory and sandbox-only. The `RecommendationSession` and `CherryPointLedger` models record what Cherry *suggested* and what the user *claims* to have done; Cherry never directly settles funds or controls a bank account.
- Verification is layered: Vine-attached sessions (hardware context) are treated as stronger signals than manual “scan before pay” claims, and future Plaid/bank/receipt integrations will move points from `PENDING` to `VERIFIED`. Until then, “verification” is simulated and must not be represented as financial truth.
- Anomaly flags (session- and ledger-level) are diagnostic only. They capture mismatches between advice and claims (card mismatch, amount mismatch, time-window violations) and are intended for internal integrity checks—not user-facing fraud labels.

## Project Structure & Module Organization
- Next.js app router lives in `app/` with routes for buckets, cards, simulations, and matching API handlers in `app/api/*` (server-first; add `"use client"` only where browser state is needed).
- New flows:
  - `/sessions` (if present) and `/api/sessions` for recommendation session creation and confirmation.
  - `/vine-simulator` as a dev-only UI to exercise `/api/vine/order` without hardware.
  - Admin tools under `/admin` wired to `/api/admin/clear-user`, `/api/admin/clear-sessions`, `/api/admin/clear-ledger`, and `/api/admin/health`.
- Shared logic stays in `lib/`:
  - `lib/engine.ts` — single canonical evaluation engine (Observe → Evaluate → Recommend) with verdicts and Cherry Points computation.
  - `lib/enums.ts` — centralized enums for verdicts, coverage modes, anomaly codes, and verification status, mirroring Prisma `$Enums` where applicable.
  - `lib/validation/*` — Zod schemas for API payloads (cards, buckets, simulate/scan, sessions, Vine orders); all API routes must parse and narrow input via these schemas.
  - `lib/vine/*` — Vine order context types and helpers (`order-context.ts`, `run-recommendation.ts`).
  - `lib/verification/*` — verification strategies (vine/bank/receipts) and the session verification orchestrator.
  - `auth.ts`, `prisma.ts`, `with-user.ts`, `logger.ts` — auth/session, DB client, auth guard, and logging helpers.
  - Database access must go through these helpers; do not instantiate Prisma clients ad hoc.
- Database schema and migrations are under `prisma/` (use `schema.prisma`, track migrations, and keep helper scripts in `prisma/scripts/`). Scripts that operate on the DB live in `scripts/` (e.g., `scripts/ingest-mcc.ts`, `scripts/seed-demo.ts`, `scripts/audit-integrity.ts`).
- Data imports (MCC PDFs/TSV) live in `data/mcc/`; ingestion and seeding utilities live in `scripts/`.
- Public assets belong in `public/`; high-level auth notes are in `docs/architecture/auth.md`.

## Build, Test, and Development Commands
- `npm install` to sync dependencies.
- `npm run dev` starts Next.js locally (defaults to :3000, falls back if busy); `npm run build` for production bundles; `npm run start` serves the build.
- Health gates:
  - `npm run lint` — ESLint with type-aware rules (no-unsafe-*, no floating promises, exhaustive switches, explicit module boundaries).
  - `npm run typecheck` — strict TypeScript against `tsconfig.json`.
  - `npm run typecheck:scripts` (if defined) — strict TypeScript against `tsconfig.scripts.json` for `scripts/*`.
  - `npm run check` — composite check (lint + both typechecks). This must be green before PRs.
- Auth for curl/CLI: `./scripts/dev-login.sh [email]` writes `cookies.txt`; use `-b cookies.txt` with API calls. Custom sign-in UI lives at `/signin` (NextAuth `pages.signIn`).
- `npm run ingest:mcc` normalizes MCC data from `data/mcc/`; `npm run seed:demo` seeds demo entities (auto-creates a user by email if needed) including sessions/ledger examples.
- Prisma:
  - `npx prisma migrate dev --name <desc>` to evolve schema (including `RecommendationSession`, `CherryPointLedger`, anomaly and verification fields).
  - `npx prisma generate` after changes so both CLI and the editor see updated enums and types.
  - `npx prisma studio` to inspect data (users, cards, buckets, sessions, ledger rows). Use this when debugging anomalies or verification status.

## Coding Style & Naming Conventions
- TypeScript + React; prefer async/await and typed responses in API routes. Use named exports when possible.
- Keep components server-rendered by default; mark client components at file top. Co-locate small client helpers next to their pages (`app/<route>/client.tsx` pattern).
- Follow ESLint guidance (2-space indent, trailing commas). Use Tailwind utility classes; avoid inline styles unless necessary.
- File names are lowercase with hyphens or canonical Next conventions (`page.tsx`, `route.ts`).
- All API routes must:
  - Use Zod schemas from `lib/validation/*` to parse `request.json()`; never treat parsed JSON as `any`.
  - Return typed responses and avoid `any`/`unknown` leaks at module boundaries.
  - Keep switch statements on enums exhaustive (use a `never` guard for default).
- Lint is strict: `@typescript-eslint/no-unsafe-*`, `@typescript-eslint/no-floating-promises`, and `@typescript-eslint/switch-exhaustiveness-check` are enforced. Don’t downgrade rules; fix the code instead.

## Testing Guidelines
- No formal suite yet—add focused unit tests around `lib/` utilities and API handlers as you touch them. Favor colocated `*.test.ts` or `__tests__` directories.
- Verify lint passes and exercise critical flows manually (`/buckets`, `/cards`, `/simulate`) before submitting.
- When adding migrations or data scripts, include a quick note on how you validated DB changes.
- When touching the engine, sessions, or ledger:
  - Add unit tests that assert invariants such as “no double-award for the same session”, “points remain PENDING until verified”, and “anomalous sessions/ledger rows are flagged consistently”.
  - Prefer narrow tests around `lib/engine.ts`, `lib/verification/verify-session.ts`, and `scripts/audit-integrity.ts` instead of broad end-to-end tests.

## Commit & Pull Request Guidelines
- Commit messages follow `type: summary` from history (e.g., `feat: add bucket budgeting UI`, `chore: update prisma schema`). Keep them imperative and scoped.
- PRs should include: what changed, why, how to test (`npm run lint`, migration commands, manual URLs), and any env var or schema impacts.
- Attach screenshots or short notes for UI/UX changes; link issues or tickets. Keep diffs small and focused; prefer follow-ups over mega-PRs.
- For schema changes (new enums/fields on sessions/ledger), document the migration name, any backfill strategy, and how you validated integrity (e.g., running `scripts/audit-integrity.ts` locally).

## Security & Configuration Tips
- Keep secrets in `.env.local` (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`/`VERCEL_URL`). Never commit env files.
- Run `npm run seed:demo` only against disposable data. After pulling new migrations, rerun `prisma migrate dev` and regenerate the client before local development.
- Apple Wallet pass is scaffolded but disabled until certs are configured; `/api/wallet/cherry-pass` returns 501 by design.
- Admin tools (`/admin`) that clear user data, sessions, or ledger entries are for local/sandbox environments only. Do not expose these endpoints in production without additional auth/role checks.
- Integrity/audit scripts (`scripts/audit-integrity.ts`) are diagnostic; they should never mutate production data without explicit review.
