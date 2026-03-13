Status: Active
Last updated: 2026-03-13

# Environment and secret policy

## Current behavior
- Cherry never stores live secrets in tracked repository files.
- `.env.example` is the only tracked environment file and defines the documented configuration contract.
- Real values must come from exported shell environment, CI configuration, or deployment platform configuration.
- Repo-root local env files such as `.env`, `.env.local`, and `.env.production.local` are developer-local configuration surfaces, not repository assets.
- Local env files must never be tracked. Guardrails enforce tracked-file policy only.
- Public URL configuration should prefer `NEXT_PUBLIC_SITE_URL`. Compatibility aliases may remain supported in code, but they are not the preferred contract.

## Future/Target behavior (explicitly speculative)
- Add automation to generate environment-variable inventories from source code so `.env.example` stays aligned with the runtime contract.
- Reduce compatibility aliases once all active deployment surfaces converge on the canonical URL variables.

## Related docs
- `docs/ci-and-guardrails.md`
- `docs/architecture/auth.md`
- `docs/wallet-pass.md`
- `AGENTS.md`
