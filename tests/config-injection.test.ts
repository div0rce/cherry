import { assertServerConfig } from '../lib/config/server';
import { assertPublicConfig } from '../lib/config/public';
import { resetServerConfigForTests, setPublicConfig, lockServerConfig } from '../lib/config/store';
import { getBaseUrl } from '../lib/base-url';
import { getWalletPassConfigStatus } from '../lib/wallet/config';
import { getVineSignatureMode } from '../lib/vine/security';

process.stdout.write('config-injection: running\n');

const serverConfig = assertServerConfig({
  appBaseUrl: 'https://app.example.test',
  databaseUrl: 'file:./tmp/test.db',
  environment: 'test',
  enableDevTools: true,
  engineVersion: 'engine-test',
  wallet: { enabled: false },
  vineSignatureMode: 'warn',
  offlineEvaluatorEnabled: true,
  bankIngest: {},
});

const publicConfig = assertPublicConfig({ appBaseUrl: 'https://public.example.test' });

resetServerConfigForTests(serverConfig);
setPublicConfig(publicConfig);
lockServerConfig();

const resolvedBaseUrl = getBaseUrl();
if (resolvedBaseUrl !== publicConfig.appBaseUrl) {
  throw new Error(`expected base url from injected config, got ${resolvedBaseUrl}`);
}

const walletStatus = getWalletPassConfigStatus(serverConfig.wallet);
if (walletStatus.ok) {
  throw new Error('expected wallet to be disabled in config injection test');
}

const vineMode = getVineSignatureMode();
if (vineMode !== 'warn') {
  throw new Error(`expected vine mode from config, got ${vineMode}`);
}

const enabledWalletStatus = getWalletPassConfigStatus({
  ...serverConfig.wallet,
  enabled: true,
  teamId: 'TEAMID',
  passTypeId: 'pass.com.cherry.pass',
  orgName: 'Cherry',
  passDescription: 'Cherry Spending Copilot Pass',
  certPassword: 'password',
  certPath: './certs/pass-cert.p12',
  wwdrCertPath: './certs/apple-wwdr.pem',
});

if (!enabledWalletStatus.ok) {
  throw new Error('expected wallet status ok when config includes all fields');
}

process.stdout.write('config-injection: ok\n');
