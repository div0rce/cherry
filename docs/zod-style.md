Status: Draft
Last updated: 2025-12-04

# Zod and linting style guide

- All schemas must be explicit and strict: `z.object({...}).strict()`. Do not allow extra fields or implicit coercions.
- Nullable must be explicit: use `.nullable()` for fields that can be null; avoid implicit acceptance of null/undefined.
- Request bodies and ingest payloads should parse through Zod before use; avoid raw `JSON.parse` or `request.json()` without schema validation.
- `@typescript-eslint/strict-boolean-expressions` is enforced with nullable primitives allowed (strings, numbers, booleans, objects) but `any` remains disallowed.
- `any` is banned; prefer precise types or `unknown` + schema refinement.
- Prisma nullability is expected (relations/optional fields); model schemas and checks accordingly rather than suppressing lint.
