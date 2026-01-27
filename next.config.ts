import { createRequire } from 'node:module';
import type { NextConfig } from 'next';

const require = createRequire(import.meta.url);
const { assertPublicConfig } = require('./lib/config/public.ts') as typeof import('./lib/config/public');
const { assertRuntimeConfig } = require('./lib/config/runtime.ts') as typeof import('./lib/config/runtime');
const { assertServerConfig } = require('./lib/config/server.ts') as typeof import('./lib/config/server');
const { setPublicConfig, setRuntimeConfig, setServerConfig, lockServerConfig } = require(
  './lib/config/store.ts'
) as typeof import('./lib/config/store');

type InitOptions = {
  lockServerConfig?: boolean;
  allowServerConfigOverwrite?: boolean;
};

let configInitialized = false;

function coerceOptionalString(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '') return 'http://localhost:3000';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
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

function parseEnvironment(env: NodeJS.ProcessEnv): 'development' | 'test' | 'production' {
  const rawEnv = (env['NODE_ENV'] ?? 'development').toLowerCase();
  if (rawEnv === 'production' || rawEnv === 'prod') return 'production';
  if (rawEnv === 'test') return 'test';
  return 'development';
}

function parseEngineVersion(env: NodeJS.ProcessEnv): string | null {
  return env['VERCEL_GIT_COMMIT_SHA'] ?? env['COMMIT_SHA'] ?? env['NEXT_PUBLIC_SITE_VERSION'] ?? null;
}

function parseDevToolsFlag(env: NodeJS.ProcessEnv, environment: 'development' | 'test' | 'production'): boolean {
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

function parseWalletConfig(env: NodeJS.ProcessEnv) {
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

function parseVineSignatureMode(env: NodeJS.ProcessEnv): 'off' | 'warn' | 'enforce' {
  const raw = (env['CHERRY_VINE_SIGNATURE_MODE'] ?? 'off').toLowerCase();
  if (raw === 'warn' || raw === 'enforce') return raw;
  return 'off';
}

function parseBankIngest(env: NodeJS.ProcessEnv) {
  const userId = env['BANK_INGEST_USER_ID'];
  const userEmail = env['BANK_INGEST_USER_EMAIL'];
  return {
    userId: typeof userId === 'string' && userId.trim() !== '' ? userId : null,
    userEmail: typeof userEmail === 'string' && userEmail.trim() !== '' ? userEmail : null,
  };
}

function buildPublicConfig(env: NodeJS.ProcessEnv) {
  return assertPublicConfig({
    appBaseUrl: coerceAppBaseUrl(env),
  });
}

function buildRuntimeConfig(env: NodeJS.ProcessEnv) {
  return assertRuntimeConfig({
    enableLogs: (env['NODE_ENV'] ?? '').toLowerCase() !== 'production',
  });
}

function buildServerConfig(env: NodeJS.ProcessEnv) {
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

function resolveLockingOptions(env: NodeJS.ProcessEnv, options?: InitOptions): Required<InitOptions> {
  const normalizedEnv = (env['NODE_ENV'] ?? 'development').toLowerCase();
  const isTest = normalizedEnv === 'test';
  return {
    lockServerConfig: options?.lockServerConfig ?? !isTest,
    allowServerConfigOverwrite: options?.allowServerConfigOverwrite ?? isTest,
  };
}

function initConfigFromEnv(env: NodeJS.ProcessEnv, options?: InitOptions) {
  if (configInitialized) {
    throw new Error(
      'Config already initialized. initConfigFromEnv must be called exactly once per process.'
    );
  }
  configInitialized = true;

  const locking = resolveLockingOptions(env, options);
  setServerConfig(buildServerConfig(env), {
    lock: false,
    allowOverwrite: locking.allowServerConfigOverwrite,
  });
  if (locking.lockServerConfig) {
    lockServerConfig();
  }
  setPublicConfig(buildPublicConfig(env));
  setRuntimeConfig(buildRuntimeConfig(env));
}

initConfigFromEnv(process.env);

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    extensionAlias: {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
    },
  },
  // Avoid tracing ephemeral Next files that might not exist in non-export builds.
  outputFileTracingExcludes: {
    '*': [
      '.next/cache/**',
      '.next/export-detail.json',
      '.next/lock',
      '.next/server/proxy.js',
      '.git/**',
      'docs/**',
      'scripts/**',
      'tests/**',
      'types/**',
      'node_modules/eslint/**',
      'node_modules/typescript/**',
      'node_modules/@typescript-eslint/**',
      'node_modules/jiti/**',
    ],
  },
};

export default nextConfig;
