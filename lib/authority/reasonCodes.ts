// authority_v1 — frozen. Any semantic change requires authority_v2.
export enum AuthorityReason {
  DAILY_STATE_RISKY = 'DAILY_STATE_RISKY',
  BUCKET_EXHAUSTED = 'BUCKET_EXHAUSTED',
  ESSENTIAL_BUFFER_LOW = 'ESSENTIAL_BUFFER_LOW',
  CATEGORY_RESTRICTED = 'CATEGORY_RESTRICTED',
  VERIFICATION_PENDING = 'VERIFICATION_PENDING',
  AMOUNT_SPIKE = 'AMOUNT_SPIKE',
}

export const AUTHORITY_REASON_SEVERITY: Record<AuthorityReason, number> = {
  [AuthorityReason.CATEGORY_RESTRICTED]: 3,
  [AuthorityReason.BUCKET_EXHAUSTED]: 3,
  [AuthorityReason.DAILY_STATE_RISKY]: 2,
  [AuthorityReason.ESSENTIAL_BUFFER_LOW]: 2,
  [AuthorityReason.VERIFICATION_PENDING]: 1,
  [AuthorityReason.AMOUNT_SPIKE]: 1,
};
