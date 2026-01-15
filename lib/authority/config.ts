// authority_v1 — frozen. Any semantic change requires authority_v2.
import { AuthorityReason, AUTHORITY_REASON_SEVERITY } from './reasonCodes';

export const authorityVersion = 'authority_v1' as const;
export type AuthorityVersion = typeof authorityVersion;

export const authorityPureBrand = Symbol('authority_pure');
export type AuthorityPure = { readonly __authorityPure: typeof authorityPureBrand };

export type AuthoritySurface = 'autopilot' | 'vine' | 'simulate' | 'scan';

type SurfaceSeverityAdjustments = Partial<
  Record<AuthoritySurface, Partial<Record<AuthorityReason, number>>>
>;

export const AUTHORITY_CONFIG = {
  version: 'authority_v1',
  reasonSeverity: AUTHORITY_REASON_SEVERITY,
  surfaceSeverityAdjustments: {} as SurfaceSeverityAdjustments,
};

export function getReasonSeverity(reason: AuthorityReason, surface: AuthoritySurface): number {
  const base = AUTHORITY_CONFIG.reasonSeverity[reason] ?? 0;
  const adjustment =
    AUTHORITY_CONFIG.surfaceSeverityAdjustments[surface]?.[reason] ?? 0;
  const severity = base + adjustment;
  return severity < 0 ? 0 : severity;
}
