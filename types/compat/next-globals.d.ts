// reason: next@16.3 declarations reference globals that TypeScript 5.9 with target ES2022 lacks: PromiseWithResolvers (ES2024 lib) and URLPatternInput / URLPatternOptions (TypeScript's DOM lib has no URLPattern; @types/node 24 declares only URLPattern/URLPatternInit globally)
// upstream: next@16.3.8
// audit: 2026-10-17
// removeWhen: Remove once the repo targets ES2024 for browser code and the TypeScript DOM lib or @types/node declares URLPatternInput and URLPatternOptions globally
// Types only: nothing here makes Promise.withResolvers() or URLPattern available at runtime, so
// browser code still cannot call them (Next 16 supports browsers that lack them).
export {};

declare global {
  interface PromiseWithResolvers<T> {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: unknown) => void;
  }
  type URLPatternInput = string | URLPatternInit;
  interface URLPatternOptions {
    ignoreCase?: boolean;
  }
}
