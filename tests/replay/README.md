Status: Active
Last updated: 2026-01-31

# Engine Replay Corpus

## Current
- Each replay trace lives in `tests/replay/<YYYY-MM>/<traceId>/`.
- Required files per trace:
  - payload.json (hash reference only)
  - versions.json
- Payload blobs live in `tests/replay/blobs/<hash>/`:
  - input.json
  - output.json
  - meta.json
- Placeholder traces may have empty `payload.json`; the replay test skips empty traces.

## Future
- Populate traces from real boundary recordings.
- Expand metadata redaction rules as needed.

## Related docs
- docs/doctrine.md
- docs/guardrails.md
- docs/engine-freeze.md
