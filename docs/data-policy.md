Status: Active
Last updated: 2026-03-13

# Financial fixture data policy

## Current behavior
- Cherry may keep synthetic financial fixtures in the repo when they are needed to exercise dev-only ingest and evaluator flows.
- Tracked fixture data must be obviously synthetic and must not contain real merchants, personal names, realistic account identifiers, or copied transaction exports.
- Realistic bank exports must never be committed to this repository.
- Local raw exports, if temporarily needed for private development, must live only in ignored workspace-only paths such as `data/bank/raw/`.
- Historical commits may still contain previously committed realistic fixtures. PR1 removes them from the current checkout only; any history rewrite requires a separate explicit decision.

## Future/Target behavior (explicitly speculative)
- Add a dedicated fixture-leak detection check for tracked financial CSVs once the P0 data purge and secret cleanup backlog items are complete.
- Standardize fixture generation so dev ingest datasets can be regenerated deterministically instead of being edited by hand.

## Related docs
- `docs/bank-ingest-notes.md`
- `docs/offline-evaluator.md`
- `docs/system-overview.md`
- `docs/legal-constraints.md`
