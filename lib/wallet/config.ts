import type { WalletCertificateConfig } from '../config/server.js';
import { getServerConfig } from '../config/store.js';

export type WalletPassConfigStatus =
  | { ok: true }
  | { ok: false; reason: 'wallet_pass_disabled' | 'missing_env' };

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

const REQUIRED_WALLET_FIELDS = [
  'teamId',
  'passTypeId',
  'orgName',
  'passDescription',
  'certPassword',
  'certPath',
  'wwdrCertPath',
] as const satisfies readonly (keyof WalletCertificateConfig)[];

export function getWalletPassConfigStatus(
  walletConfig?: WalletCertificateConfig
): WalletPassConfigStatus {
  const config = walletConfig ?? getServerConfig().wallet;

  if (config.enabled !== true) {
    return { ok: false, reason: 'wallet_pass_disabled' };
  }

  if (!REQUIRED_WALLET_FIELDS.every((field) => hasNonEmptyString(config[field]))) {
    return { ok: false, reason: 'missing_env' };
  }

  return { ok: true };
}
