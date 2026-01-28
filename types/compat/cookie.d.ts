// reason: cookie module lacks bundled typings required by auth stack
// upstream: cookie (types missing)
// audit: 2026-01-28
// removeWhen: Remove once cookie ships types or @types/cookie satisfies imports
declare module 'cookie' {
  export interface CookieSerializeOptions {
    [key: string]: unknown;
  }
}
