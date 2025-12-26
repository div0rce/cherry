export type VineSignatureMode = 'off' | 'warn' | 'enforce';

export type WalletCertificateConfig = {
  enabled: boolean;
  teamId?: string | null;
  passTypeId?: string | null;
  orgName?: string | null;
  passDescription?: string | null;
  certPassword?: string | null;
  certPath?: string | null;
  wwdrCertPath?: string | null;
};

export type BankIngestConfig = {
  userId?: string | null;
  userEmail?: string | null;
};

export type ServerConfig = {
  appBaseUrl: string;
  databaseUrl: string;
  environment: 'development' | 'test' | 'production';
  enableDevTools: boolean;
  engineVersion: string | null;
  wallet: WalletCertificateConfig;
  vineSignatureMode: VineSignatureMode;
  offlineEvaluatorEnabled: boolean;
  bankIngest: BankIngestConfig;
};

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`ServerConfig.${field} required`);
  }
}

function assertWalletConfig(config: WalletCertificateConfig): void {
  if (typeof config.enabled !== 'boolean') {
    throw new Error('ServerConfig.wallet.enabled must be boolean');
  }

  if (!config.enabled) return;

  const maybeStrings = [
    config.teamId,
    config.passTypeId,
    config.orgName,
    config.passDescription,
    config.certPassword,
    config.certPath,
    config.wwdrCertPath,
  ];

  const hasBadType = maybeStrings.some(
    (value) => value !== undefined && value !== null && typeof value !== 'string'
  );
  if (hasBadType) {
    throw new Error('ServerConfig.wallet fields must be strings when provided');
  }
}

export function assertServerConfig(config: ServerConfig): ServerConfig {
  if (typeof config.appBaseUrl !== 'string') {
    throw new Error('ServerConfig.appBaseUrl required');
  }
  const trimmedBaseUrl = config.appBaseUrl.trim();
  if (trimmedBaseUrl === '') {
    throw new Error('ServerConfig.appBaseUrl required');
  }
  if (!/^https?:\/\//.test(trimmedBaseUrl)) {
    throw new Error('ServerConfig.appBaseUrl must be absolute');
  }

  assertNonEmptyString(config.databaseUrl, 'databaseUrl');

  if (!['development', 'test', 'production'].includes(config.environment)) {
    throw new Error('ServerConfig.environment must be development | test | production');
  }

  if (typeof config.enableDevTools !== 'boolean') {
    throw new Error('ServerConfig.enableDevTools must be boolean');
  }

  if (config.engineVersion !== null && typeof config.engineVersion !== 'string') {
    throw new Error('ServerConfig.engineVersion must be string | null');
  }

  if (config.vineSignatureMode !== 'off' && config.vineSignatureMode !== 'warn' && config.vineSignatureMode !== 'enforce') {
    throw new Error('ServerConfig.vineSignatureMode must be off | warn | enforce');
  }

  if (typeof config.offlineEvaluatorEnabled !== 'boolean') {
    throw new Error('ServerConfig.offlineEvaluatorEnabled must be boolean');
  }

  if (
    config.bankIngest.userId !== undefined &&
    config.bankIngest.userId !== null &&
    (typeof config.bankIngest.userId !== 'string' || config.bankIngest.userId.trim() === '')
  ) {
    throw new Error('ServerConfig.bankIngest.userId must be string | null | undefined');
  }
  if (
    config.bankIngest.userEmail !== undefined &&
    config.bankIngest.userEmail !== null &&
    (typeof config.bankIngest.userEmail !== 'string' || config.bankIngest.userEmail.trim() === '')
  ) {
    throw new Error('ServerConfig.bankIngest.userEmail must be string | null | undefined');
  }

  assertWalletConfig(config.wallet);

  return config;
}
