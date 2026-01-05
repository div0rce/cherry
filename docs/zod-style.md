Status: Draft
Last updated: 2026-01-02

# Zod and linting style guide

## Current behavior (enforced / in code)
- Zod schemas live in `lib/schemas/*` and parse JSON via `parseJsonBody` from `lib/validation.ts`.
- ESLint/TS rules enforce strict boolean expressions and ban `any`.

- All schemas must be explicit and strict: `z.object({...}).strict()`. Do not allow extra fields or implicit coercions.
- Nullable must be explicit: use `.nullable()` for fields that can be null; avoid implicit acceptance of null/undefined.
- Request bodies and ingest payloads should parse through Zod before use; avoid raw `JSON.parse` or `request.json()` without schema validation.
- `@typescript-eslint/strict-boolean-expressions` is enforced with nullable primitives allowed (strings, numbers, booleans, objects) but `any` remains disallowed.
- `any` is banned; prefer precise types or `unknown` + schema refinement.
- Prisma nullability is expected (relations/optional fields); model schemas and checks accordingly rather than suppressing lint.

## Future/Target behavior (explicitly speculative)
- Add shared schema utilities to reduce duplication across API routes.

## Related docs
- `docs/guardrails.md`
- `docs/script-standards.md`
