Status: Active
Last updated: 2025-12-29

# Script Standards

## Current behavior
- Scripts are ESM by extension; `.mts` only lives under `scripts/`, runtime code stays `.ts`.
- Guardrail entrypoints are registered in `scripts/guardrails/registry.mts` and must be reachable from `npm run check`.
- Execution entrypoints are registered in `scripts/execution/registry.mts` and run via `npm run ts:esm -- scripts/execution/run.mts <name>`.
- CI must run `npm run check` and it must be the final non-empty command in the job.
- JSON inputs must be parsed via `scripts/guardrails/lib/read-json.mts`; raw `JSON.parse` is forbidden outside that helper.
- NPM script args must be forwarded with `--` (use `npm run <script> -- <args>`).
- `any` is forbidden in scripts; use `unknown` plus explicit schema/type guards.
- `catch` params must be typed as `unknown` and normalized before use.
- Orphan scripts are forbidden; register or delete them.

## Future/Target behavior
- TODO: Keep execution and guardrail registries fully derivable from documented standards.
