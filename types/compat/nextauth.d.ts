// reason: @auth/core Adapter type is not exposed in current upstream typings
// upstream: @auth/core@0.41.1
// audit: 2026-01-28
// removeWhen: Remove once @auth/core exports Adapter type
declare module '@auth/core/adapters' {
  export type Adapter = Record<string, unknown>;
}
