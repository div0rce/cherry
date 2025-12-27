import { assertPublicConfig, type PublicConfig } from './public';
import { assertRuntimeConfig, type RuntimeConfig } from './runtime';
import {
  assertServerConfig,
  type BankIngestConfig,
  type ServerConfig,
  type VineSignatureMode,
  type WalletCertificateConfig,
} from './server';

function coerceOptionalString(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function coerceAppBaseUrl(env: NodeJS.ProcessEnv): string {
  const fallback = 'http://localhost:3000';
  const appBaseUrl = env['APP_BASE_URL'];
  const siteUrl = env['NEXT_PUBLIC_SITE_URL'];
  const rawVercelUrl = env['NEXT_PUBLIC_VERCEL_URL'];
  const vercelUrl =
    typeof rawVercelUrl === 'string' && rawVercelUrl.trim() !== ''
      ? rawVercelUrl.startsWith('http')
        ? rawVercelUrl
        : `https://${rawVercelUrl}`
      : null;
  const nextAuthUrl = env['NEXTAUTH_URL'];
  const publicBaseUrl = env['NEXT_PUBLIC_BASE_URL'];

  const baseUrlCandidates = [appBaseUrl, siteUrl, vercelUrl, nextAuthUrl, publicBaseUrl];

  for (const candidate of baseUrlCandidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed !== '') {
        return normalizeBaseUrl(trimmed);
      }
    }
  }

  return fallback;
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '') return 'http://localhost:3000';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function parseEnvironment(env: NodeJS.ProcessEnv): ServerConfig['environment'] {
  const rawEnv = (env['NODE_ENV'] ?? 'development').toLowerCase();
  if (rawEnv === 'production' || rawEnv === 'prod') return 'production';
  if (rawEnv === 'test') return 'test';
  return 'development';
}

function parseEngineVersion(env: NodeJS.ProcessEnv): string | null {
  return env['VERCEL_GIT_COMMIT_SHA'] ?? env['COMMIT_SHA'] ?? env['NEXT_PUBLIC_SITE_VERSION'] ?? null;
}

function parseDevToolsFlag(env: NodeJS.ProcessEnv, environment: ServerConfig['environment']): boolean {
  if (env['ENABLE_DEV_TOOLS'] === 'true') return true;
  if (env['ENABLE_DEV_TOOLS'] === 'false') return false;
  return environment !== 'production';
}

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return defaultValue;
}

function parseWalletConfig(env: NodeJS.ProcessEnv): WalletCertificateConfig {
  const enabled = env['CHERRY_WALLET_PASS_ENABLED'] === 'true';
  return {
    enabled,
    teamId: coerceOptionalString(env['APPLE_WALLET_TEAM_ID']),
    passTypeId: coerceOptionalString(env['APPLE_WALLET_PASS_TYPE_ID']),
    orgName: coerceOptionalString(env['APPLE_WALLET_ORG_NAME']),
    passDescription: coerceOptionalString(env['APPLE_WALLET_PASS_DESCRIPTION']),
    certPassword: coerceOptionalString(env['APPLE_WALLET_CERT_PASSWORD']),
    certPath: coerceOptionalString(env['APPLE_WALLET_CERT_PATH']),
    wwdrCertPath: coerceOptionalString(env['APPLE_WALLET_WWDR_CERT_PATH']),
  };
}

function parseVineSignatureMode(env: NodeJS.ProcessEnv): VineSignatureMode {
  const raw = (env['CHERRY_VINE_SIGNATURE_MODE'] ?? 'off').toLowerCase();
  if (raw === 'warn' || raw === 'enforce') return raw;
  return 'off';
}

function parseBankIngest(env: NodeJS.ProcessEnv): BankIngestConfig {
  const userId = env['BANK_INGEST_USER_ID'];
  const userEmail = env['BANK_INGEST_USER_EMAIL'];
  return {
    userId: typeof userId === 'string' && userId.trim() !== '' ? userId : null,
    userEmail: typeof userEmail === 'string' && userEmail.trim() !== '' ? userEmail : null,
  };
}

export function buildPublicConfig(env: NodeJS.ProcessEnv): PublicConfig {
  return assertPublicConfig({
    appBaseUrl: coerceAppBaseUrl(env),
  });
}

export function buildRuntimeConfig(env: NodeJS.ProcessEnv): RuntimeConfig {
  return assertRuntimeConfig({
    enableLogs: (env['NODE_ENV'] ?? '').toLowerCase() !== 'production',
  });
}

export function buildServerConfig(env: NodeJS.ProcessEnv): ServerConfig {
  const environment = parseEnvironment(env);
  const databaseUrl = env['DATABASE_URL'] ?? 'file:./dev.db';

  return assertServerConfig({
    appBaseUrl: coerceAppBaseUrl(env),
    databaseUrl,
    environment,
    enableDevTools: parseDevToolsFlag(env, environment),
    engineVersion: parseEngineVersion(env),
    wallet: parseWalletConfig(env),
    vineSignatureMode: parseVineSignatureMode(env),
    offlineEvaluatorEnabled: parseBooleanEnv(env['CHERRY_OFFLINE_EVALUATOR_ENABLED'], true),
    bankIngest: parseBankIngest(env),
  });
}
