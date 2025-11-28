# Repository Guidelines

## Product Identity & Guardrails
- Cherry is a real-time spending advisor, not a payment card or proxy. It does not front or route transactions, hold funds, or touch payment rails.
- Core loop: **Observe → Evaluate → Recommend → Reward**. Cherry observes context (merchant/amount/user data), evaluates budgets + rewards, recommends a card/decision, and can reward users for following advice.
- Cherry Pass and pre-swipe scans are advisory surfaces only; Wallet pass endpoint currently returns 501 until certs are configured.
- Cherry Vine (hardware) is a context beacon: on-counter node that hears order metadata (merchant, amount, timestamp) and broadcasts to phones via BLE/NFC. It never reads card data, speaks EMV, or acts as a payment terminal.

## Project Structure & Module Organization
- Next.js app router lives in `app/` with routes for buckets, cards, simulations, and matching API handlers in `app/api/*` (server-first; add `"use client"` only where browser state is needed).
- Shared logic stays in `lib/` (`auth.ts`, `prisma.ts`, `simulation.ts`, `mccCategoryMapper.ts`, `with-user.ts`). Keep database access behind these helpers.
- Database schema and migrations are under `prisma/` (use `schema.prisma`, track migrations, and keep helper scripts in `prisma/scripts/`).
- Data imports (MCC PDFs/TSV) live in `data/mcc/`; ingestion and seeding utilities live in `scripts/`.
- Public assets belong in `public/`; high-level auth notes are in `docs/architecture/auth.md`.

## Build, Test, and Development Commands
- `npm install` to sync dependencies.
- `npm run dev` starts Next.js locally (defaults to :3000, falls back if busy); `npm run build` for production bundles; `npm run start` serves the build.
- Health gates: `npm run typecheck` (strict TS), `npm run lint`, `npm run build` before PRs.
- Auth for curl/CLI: `./scripts/dev-login.sh [email]` writes `cookies.txt`; use `-b cookies.txt` with API calls. Custom sign-in UI lives at `/signin` (NextAuth `pages.signIn`).
- `npm run ingest:mcc` normalizes MCC data from `data/mcc/`; `npm run seed:demo` seeds demo entities (auto-creates a user by email if needed).
- Prisma: `npx prisma migrate dev --name <desc>` to evolve schema, `npx prisma generate` after changes, `npx prisma studio` to inspect data.

## Coding Style & Naming Conventions
- TypeScript + React; prefer async/await and typed responses in API routes. Use named exports when possible.
- Keep components server-rendered by default; mark client components at file top. Co-locate small client helpers next to their pages (`app/<route>/client.tsx` pattern).
- Follow ESLint guidance (2-space indent, trailing commas). Use Tailwind utility classes; avoid inline styles unless necessary.
- File names are lowercase with hyphens or canonical Next conventions (`page.tsx`, `route.ts`).

## Testing Guidelines
- No formal suite yet—add focused unit tests around `lib/` utilities and API handlers as you touch them. Favor colocated `*.test.ts` or `__tests__` directories.
- Verify lint passes and exercise critical flows manually (`/buckets`, `/cards`, `/simulate`) before submitting.
- When adding migrations or data scripts, include a quick note on how you validated DB changes.

## Commit & Pull Request Guidelines
- Commit messages follow `type: summary` from history (e.g., `feat: add bucket budgeting UI`, `chore: update prisma schema`). Keep them imperative and scoped.
- PRs should include: what changed, why, how to test (`npm run lint`, migration commands, manual URLs), and any env var or schema impacts.
- Attach screenshots or short notes for UI/UX changes; link issues or tickets. Keep diffs small and focused; prefer follow-ups over mega-PRs.

## Security & Configuration Tips
- Keep secrets in `.env.local` (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`/`VERCEL_URL`). Never commit env files.
- Run `npm run seed:demo` only against disposable data. After pulling new migrations, rerun `prisma migrate dev` and regenerate the client before local development.
- Apple Wallet pass is scaffolded but disabled until certs are configured; `/api/wallet/cherry-pass` returns 501 by design.
