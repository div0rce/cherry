/**
 * COMPATIBILITY SHIM
 * Reason: @auth/core Adapter type is not exposed in current upstream typings.
 * Scope: @auth/core/adapters
 * Audit: review on next-auth/@auth upgrade.
 */
declare module '@auth/core/adapters' {
  export type Adapter = Record<string, unknown>;
}
