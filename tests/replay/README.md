Status: Active
Last updated: 2026-01-31

# Engine Replay Corpus

## Current
- Each replay trace lives in `tests/replay/<YYYY-MM>/<traceId>/`.
- Required files per trace:
  - input.json
  - versions.json
  - output.json
  - meta.json
- Placeholder traces may have empty files; the replay test skips empty traces.

## Future
- Populate traces from real boundary recordings.
- Expand metadata redaction rules as needed.

## Related docs
- docs/doctrine.md
- docs/guardrails.md
- docs/engine-freeze.md
