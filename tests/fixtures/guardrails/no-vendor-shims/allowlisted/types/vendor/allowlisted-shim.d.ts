// reason: Fixture shim to validate allowlist metadata enforcement
// upstream: fixture@0.0.0
// audit: 2026-01-27
// removeWhen: Delete fixture once guardrail is verified

declare module 'fixture/shim' {
  export type Shim = string;
}
