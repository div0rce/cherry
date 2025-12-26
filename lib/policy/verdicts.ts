export const AUTHORITY_VERDICTS = [
  'ALLOW_SIMULATED',
  'WARN_SIMULATED',
  'FLAG_SIMULATED',
] as const;

export type AuthorityVerdict = (typeof AUTHORITY_VERDICTS)[number];

export function isAuthorityVerdict(value: unknown): value is AuthorityVerdict {
  return AUTHORITY_VERDICTS.includes(value as AuthorityVerdict);
}
