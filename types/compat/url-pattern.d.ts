// reason: next@16.3 declarations reference global URLPatternInput and URLPatternOptions; TypeScript 5.9 lib.dom lacks URLPattern and @types/node 24 declares only URLPattern/URLPatternInit globally
// upstream: next@16.3.8
// audit: 2026-10-17
// removeWhen: Remove once the TypeScript DOM lib or @types/node declares URLPatternInput and URLPatternOptions globally
export {};

declare global {
  type URLPatternInput = string | URLPatternInit;
  interface URLPatternOptions {
    ignoreCase?: boolean;
  }
}
