import type { EngineContext, EngineSurface } from './types.js';

// Bump when core decision behavior or payload shapes materially change.
export const ENGINE_VERSION = 'v0.2.0';

export function fromExternalContextToEngineContext(input: {
  surface?: EngineSurface;
  nowMs: number;
  merchantName?: string | null;
  merchantDomain?: string | null;
  merchantCategoryKey?: string | null;
  mcc?: string | null;
  amountCents?: number | null;
  locationCity?: string | null;
  locationCountry?: string | null;
}): EngineContext {
  if (input.nowMs == null || Number.isNaN(input.nowMs)) {
    throw new Error('EngineContext requires explicit `nowMs`');
  }

  return {
    surface: input.surface == null ? 'unknown' : input.surface,
    nowMs: input.nowMs,
    merchantName: input.merchantName == null ? null : input.merchantName,
    merchantDomain: input.merchantDomain == null ? null : input.merchantDomain,
    merchantCategoryKey:
      input.merchantCategoryKey == null ? null : input.merchantCategoryKey,
    mcc: input.mcc == null ? null : input.mcc,
    amountCents: input.amountCents == null ? null : input.amountCents,
    locationCity: input.locationCity == null ? null : input.locationCity,
    locationCountry: input.locationCountry == null ? null : input.locationCountry,
    payPeriodDayOfCycle: null,
  };
}

// Legacy alias preserved for existing callers.
export const buildEngineContext = fromExternalContextToEngineContext;
