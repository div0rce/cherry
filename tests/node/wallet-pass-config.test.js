import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getWalletPassConfigStatus } = require('../../lib/wallet/config');
const { assertServerConfig } = require('../../lib/config/server');

console.warn('wallet-pass-config: running tests');

const baseConfig = {
  appBaseUrl: 'http://localhost:3000',
  databaseUrl: 'file:./dev.db',
  environment: 'test',
  enableDevTools: true,
  engineVersion: 'test-engine',
  wallet: { enabled: false },
  vineSignatureMode: 'off',
  offlineEvaluatorEnabled: true,
  bankIngest: {},
};

function buildConfig(walletOverrides) {
  return assertServerConfig({
    ...baseConfig,
    wallet: { ...baseConfig.wallet, ...walletOverrides },
  });
}

// 1) Default: disabled
{
  const config = buildConfig({});
  const status = getWalletPassConfigStatus(config.wallet);
  if (status.ok) throw new Error('expected wallet pass to be disabled by default');
  if (status.reason !== 'wallet_pass_disabled') {
    throw new Error(`unexpected reason: ${status.reason}`);
  }
}

// 2) Flag true but missing env → missing_env
{
  const config = buildConfig({ enabled: true });
  const status = getWalletPassConfigStatus(config.wallet);
  if (status.ok) throw new Error('expected missing_env when config is incomplete');
  if (status.reason !== 'missing_env') {
    throw new Error(`expected missing_env, got ${status.reason}`);
  }
}

// 3) Flag true + all fields → ok
{
  const config = buildConfig({
    enabled: true,
    teamId: 'TEAMID',
    passTypeId: 'pass.com.cherry.pass',
    orgName: 'Cherry',
    passDescription: 'Cherry Spending Copilot Pass',
    certPassword: 'password',
    certPath: './certs/pass-cert.p12',
    wwdrCertPath: './certs/apple-wwdr.pem',
  });
  const status = getWalletPassConfigStatus(config.wallet);
  if (status.ok !== true) throw new Error(`expected ok, got ${status.reason}`);
}

console.warn('wallet-pass-config: ok');
