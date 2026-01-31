Status: Active
Last updated: 2026-01-31

# Engine Replay Corpus

## Current
- Replay payloads are content-addressed objects under `tests/replay/objects/aa/bb/<hash>.json`.
- Replay indexes live in `tests/replay/index/engine@*.json` (version snapshot + hash list).
- Indexes reference objects by hash only; payloads are stored once.
- Staging traces live under `tests/replay/_staging/` and must never be committed.

## Future
- Populate traces from real boundary recordings.
- Expand metadata redaction rules as needed.

## Related docs
- docs/doctrine.md
- docs/guardrails.md
- docs/engine-freeze.md
