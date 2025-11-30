Status: Canonical layout
Last updated: 2025-11-30

# Cherry Repository Structure

Use this as the source of truth for where things live and where new code should go. See `AGENTS.md` for operating rules and `docs/legal-constraints.md` for product guardrails.

## Top-Level Overview (curated)
```
.
├─ app/              # Next.js App Router UI + API entrypoints
│  ├─ (routes)       # pages like /scan, /sessions, /cards, /buckets, /vine-simulator
│  └─ api/           # REST-ish handlers (scan, sessions, vine, wallet, admin, etc.)
├─ components/       # Shared UI components (client/server as needed)
├─ lib/              # Shared domain logic (engine, validation, enums, vine, wallet, auth helpers)
├─ prisma/           # Database schema and migrations
├─ scripts/          # Source scripts (ingest, seed, audit)
├─ dist-scripts/     # Built script artifacts (keep generated outputs here)
├─ data/             # MCC and other ingest inputs
├─ docs/             # Product + technical docs (vision, vine, wallet, API, agents, audits, structure)
├─ public/           # Static assets served by Next.js
├─ types/            # Shared TypeScript types
├─ .github/          # GitHub meta (e.g., copilot instructions)
├─ Config files      # tsconfig*.json, eslint.config.mjs, next.config.ts, package*.json, postcss.config.mjs
└─ .vscode/          # Editor settings (optional)
```

## Directory Purposes, Do/Don’t

### app/
- **Purpose:** All UI routes and API route handlers (Next.js App Router). This is the entrypoint for Observe/Recommend surfaces and API boundaries.
- **Put here:** Route files (`page.tsx`, `layout.tsx`), server components, client components for route-specific UI, API `route.ts` handlers.
- **Do NOT put:** Heavy domain logic (belongs in `lib/`), scripts, Prisma client instantiation (use `@/lib/prisma`).

### components/
- **Purpose:** Reusable UI blocks shared across routes.
- **Put here:** Presentational components, shared client/server components that aren’t route-specific.
- **Do NOT put:** Business logic, API helpers, data access.

### lib/
- **Purpose:** Shared domain logic and helpers.
- **Put here:** Engine (`lib/engine.ts`, `engine-invariants`), enums, validation schemas, auth helpers (`with-user`, `auth`), vine helpers (`lib/vine/*`), wallet helpers (`lib/wallet/*`), points/verification helpers.
- **Do NOT put:** Route handlers, Prisma client instantiation outside `lib/prisma`.

### prisma/
- **Purpose:** Database schema/migrations.
- **Put here:** `schema.prisma`, migration folders, Prisma scripts under `prisma/scripts/` if needed.
- **Do NOT move:** `schema.prisma` out of this directory.

### scripts/
- **Purpose:** Source scripts for maintenance/ingest/seed/audit.
- **Put here:** TS/JS scripts run via npm scripts (e.g., ingest MCC, seed demo, audit integrity).
- **Do NOT put:** Built artifacts (those belong in `dist-scripts/`).

### dist-scripts/
- **Purpose:** Generated/build outputs for scripts.
- **Put here:** Compiled script artifacts if needed for deployment/runtime.
- **Do NOT edit** by hand; treat as build output.

### data/
- **Purpose:** Input datasets (e.g., MCC TSV/PDF/JSON).
- **Put here:** MCC sources and similar static inputs for ingest scripts.
- **Do NOT put:** Generated outputs (those go to `dist-scripts/` or `data/mcc` outputs as appropriate).

### docs/
- **Purpose:** Canonical documentation.
- **Contains:** Product identity (cherry-vision), hardware (cherry-vine), wallet pass, API reference, agent guidance, audits (core-loop-audit), repo structure/plan.
- **Do NOT put:** Code, migrations, or scripts.

### public/
- **Purpose:** Static assets served by Next.js.
- **Put here:** Images, icons, fonts, manifest files.
- **Do NOT put:** Sensitive data or server code.

### types/
- **Purpose:** Shared TypeScript declarations.
- **Put here:** Global types that don’t fit elsewhere.
- **Do NOT put:** Business logic or React components.

### .github/
- **Purpose:** GitHub-specific config (actions, copilot instructions).
- **Do NOT put:** App code.

### Config files
- **Purpose:** Tooling configuration (Next.js, TypeScript, ESLint, PostCSS, package scripts).
- **Do NOT duplicate** conflicting configs; update central ones when structure changes.

## Mapping to Cherry’s Product Model
- **Observe/Recommend surfaces:** `app/` (UI routes like `/scan`, `/vine-simulator`, APIs like `/api/scan`, `/api/vine/order`).
- **Evaluate (engine):** `lib/engine.ts` + invariants, enums, validation in `lib/validation`.
- **Reward (sessions/ledger):** `app/api/sessions/*` entrypoints backed by `lib` helpers and Prisma models (`RecommendationSession`, `CherryPointLedger`).
- **Vine context:** `lib/vine/*`, `app/api/vine/order`, UI `/vine-simulator`.
- **Wallet pass scaffold:** `lib/wallet/*`, `app/api/wallet/cherry-pass`.
- **Data/model:** `prisma/` schema + migrations, seeded via `scripts/`.
- **Docs:** `docs/` contains identity, hardware, wallet, API, and audit references to align code with product constraints.

## Conventions for New Code
- Keep API route handlers thin; push logic into `lib/`.
- Use `@/lib/prisma` for DB access; no new Prisma clients elsewhere.
- Validate inputs with Zod schemas in `lib/validation/*`.
- Place new scripts in `scripts/` (source) and build to `dist-scripts/` only if needed.
- Keep docs in `docs/`; add cross-links when adding new surfaces.
- Maintain Next.js App Router patterns (server-first; mark client components explicitly).
- Preserve public API paths unless intentionally versioned.
- Use `git mv` for any relocations to keep history, and update path aliases/imports accordingly.
