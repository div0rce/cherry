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

function assertVineSignatureModePolicy(config: ServerConfig): void {
  if (config.environment === 'production' && config.vineSignatureMode !== 'enforce') {
    throw new Error('Invalid Vine configuration: production requires enforce mode');
  }
}

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`ServerConfig.${field} required`);
  }
}

function assertWalletConfig(config: WalletCertificateConfig): void {
  assertBoolean(config.enabled, 'wallet.enabled');
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

  if (!maybeStrings.every(isOptionalString)) {
    throw new Error('ServerConfig.wallet fields must be strings when provided');
  }
}

function assertAbsoluteBaseUrl(value: unknown): void {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed === '') {
    throw new Error('ServerConfig.appBaseUrl required');
  }
  if (!/^https?:\/\//.test(trimmed)) {
    throw new Error('ServerConfig.appBaseUrl must be absolute');
  }
}

function assertBoolean(value: unknown, field: string): void {
  if (typeof value !== 'boolean') {
    throw new Error(`ServerConfig.${field} must be boolean`);
  }
}

function assertOneOf(value: unknown, allowed: readonly string[], message: string): void {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new Error(message);
  }
}

const isAbsent = (value: unknown): boolean => value === undefined || value === null;
const isOptionalString = (value: unknown): boolean => isAbsent(value) || typeof value === 'string';
// Absent is allowed; present must be a non-blank string.
const isOptionalNonBlankString = (value: unknown): boolean =>
  isAbsent(value) || (typeof value === 'string' && value.trim() !== '');

function assertBankIngest(bankIngest: ServerConfig['bankIngest']): void {
  if (!isOptionalNonBlankString(bankIngest.userId)) {
    throw new Error('ServerConfig.bankIngest.userId must be string | null | undefined');
  }
  if (!isOptionalNonBlankString(bankIngest.userEmail)) {
    throw new Error('ServerConfig.bankIngest.userEmail must be string | null | undefined');
  }
}

export function assertServerConfig(config: ServerConfig): ServerConfig {
  assertAbsoluteBaseUrl(config.appBaseUrl);
  assertNonEmptyString(config.databaseUrl, 'databaseUrl');
  assertOneOf(
    config.environment,
    ['development', 'test', 'production'],
    'ServerConfig.environment must be development | test | production'
  );
  assertBoolean(config.enableDevTools, 'enableDevTools');
  if (!(config.engineVersion === null || typeof config.engineVersion === 'string')) {
    throw new Error('ServerConfig.engineVersion must be string | null');
  }
  assertOneOf(config.vineSignatureMode, ['off', 'warn', 'enforce'], 'ServerConfig.vineSignatureMode must be off | warn | enforce');
  assertVineSignatureModePolicy(config);
  assertBoolean(config.offlineEvaluatorEnabled, 'offlineEvaluatorEnabled');
  assertBankIngest(config.bankIngest);
  assertWalletConfig(config.wallet);
  return config;
}
