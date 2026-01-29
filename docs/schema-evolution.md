Status: Active
Last updated: 2026-01-29

# Schema Evolution Rules

## Scope (what counts as a schema change)
- prisma/schema.prisma changes
- prisma/migrations/** additions or edits
- DB truth scripts/tests under scripts/db-check-* or tests/db/**

## Required steps per schema change
1. Create or update a migration under prisma/migrations/**.
2. Update scripts/schema/manifest.json:
   - bump schemaVersion for table/constraint changes
   - bump invariantsVersion for DB truth or accounting invariant changes
   - set lastMigration to the newest migration folder
3. Run prisma generation and ensure migration hygiene guardrails pass.
4. Update this document when rules or expectations change.

## Forbidden changes (must not land)
- Dropping columns or tables without a staged expand/contract plan.
- Weakening constraints (removing NOT NULL, UNIQUE, CHECK) without an explicit compatibility plan.
- Changing money semantics without an accounting/backfill plan and versioned invariants.
- Editing historical migrations except for documented formatting fixes.

## Breaking change protocol (required)
Breaking changes require:
- an expand/contract staged plan
- a backfill step or dual-write window
- an explicit deprecation marker

Destructive migrations must include a plan at:
docs/schema-breaking/<migration-id>.md

The plan must include:
- rationale
- backfill/rollback plan
- contract impact

## Related docs
- docs/guardrails.md
- docs/ci-and-guardrails.md
