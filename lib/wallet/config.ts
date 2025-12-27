import type { WalletCertificateConfig } from '../config/server';
import { getServerConfig } from '../config/store';

export type WalletPassConfigStatus =
  | { ok: true }
  | { ok: false; reason: 'wallet_pass_disabled' | 'missing_env' };

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

export function getWalletPassConfigStatus(
  walletConfig?: WalletCertificateConfig
): WalletPassConfigStatus {
  const config = walletConfig ?? getServerConfig().wallet;

  if (!config.enabled) {
    return { ok: false, reason: 'wallet_pass_disabled' };
  }

  if (
    !hasNonEmptyString(config.teamId) ||
    !hasNonEmptyString(config.passTypeId) ||
    !hasNonEmptyString(config.orgName) ||
    !hasNonEmptyString(config.passDescription) ||
    !hasNonEmptyString(config.certPassword) ||
    !hasNonEmptyString(config.certPath) ||
    !hasNonEmptyString(config.wwdrCertPath)
  ) {
    return { ok: false, reason: 'missing_env' };
  }

  return { ok: true };
}
