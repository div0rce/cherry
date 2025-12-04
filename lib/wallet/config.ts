export type WalletPassConfigStatus =
  | { ok: true }
  | { ok: false; reason: 'wallet_pass_disabled' | 'missing_env' };

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

export function getWalletPassConfigStatus(): WalletPassConfigStatus {
  const {
    APPLE_WALLET_TEAM_ID,
    APPLE_WALLET_PASS_TYPE_ID,
    APPLE_WALLET_ORG_NAME,
    APPLE_WALLET_PASS_DESCRIPTION,
    APPLE_WALLET_CERT_PASSWORD,
    APPLE_WALLET_CERT_PATH,
    APPLE_WALLET_WWDR_CERT_PATH,
    CHERRY_WALLET_PASS_ENABLED,
  } = process.env;

  if (CHERRY_WALLET_PASS_ENABLED !== 'true') {
    return { ok: false, reason: 'wallet_pass_disabled' };
  }

  if (
    !hasNonEmptyString(APPLE_WALLET_TEAM_ID) ||
    !hasNonEmptyString(APPLE_WALLET_PASS_TYPE_ID) ||
    !hasNonEmptyString(APPLE_WALLET_ORG_NAME) ||
    !hasNonEmptyString(APPLE_WALLET_PASS_DESCRIPTION) ||
    !hasNonEmptyString(APPLE_WALLET_CERT_PASSWORD) ||
    !hasNonEmptyString(APPLE_WALLET_CERT_PATH) ||
    !hasNonEmptyString(APPLE_WALLET_WWDR_CERT_PATH)
  ) {
    return { ok: false, reason: 'missing_env' };
  }

  return { ok: true };
}
