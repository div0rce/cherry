/**
 * VENDOR SHIM
 * Reason: NodeNext/ESM requires explicit extensions; vendor .d.ts import paths violate NodeNext.
 * Scope: types/vendor/vercel-og-satori.d.ts
 * Version: next@16.0.8
 * Audit: 2026-01-27
 */

declare module 'next/dist/compiled/@vercel/og/satori' {
  export type SatoriOptions = {
    fonts?: unknown;
  };
}
