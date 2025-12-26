/**
 * COMPATIBILITY SHIM
 * Reason: cookie module lacks bundled typings required by next-auth core types.
 * Scope: cookie
 * Audit: review on next-auth or cookie upgrade.
 */
declare module 'cookie' {
  export interface CookieSerializeOptions {
    [key: string]: unknown;
  }
}
