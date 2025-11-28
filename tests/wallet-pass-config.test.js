/* eslint-disable @typescript-eslint/no-require-imports */
const { getWalletPassConfigStatus } = require('../lib/wallet/config');

function withEnv(overrides, fn) {
  const original = { ...process.env };
  Object.assign(process.env, overrides);
  try {
    fn();
  } finally {
    process.env = original;
  }
}

console.log('wallet-pass-config: running tests');

// 1) Default: disabled
withEnv({}, () => {
  const status = getWalletPassConfigStatus();
  if (status.ok) throw new Error('expected wallet pass to be disabled by default');
  if (status.reason !== 'wallet_pass_disabled' && status.reason !== 'missing_env') {
    throw new Error(`unexpected reason: ${status.reason}`);
  }
});

// 2) Flag true but missing env → missing_env
withEnv({ CHERRY_WALLET_PASS_ENABLED: 'true' }, () => {
  const status = getWalletPassConfigStatus();
  if (status.ok) throw new Error('expected missing_env when env is incomplete');
  if (status.reason !== 'missing_env') {
    throw new Error(`expected missing_env, got ${status.reason}`);
  }
});

// 3) Flag true + all env → ok
withEnv(
  {
    CHERRY_WALLET_PASS_ENABLED: 'true',
    APPLE_WALLET_TEAM_ID: 'TEAMID',
    APPLE_WALLET_PASS_TYPE_ID: 'pass.com.cherry.pass',
    APPLE_WALLET_ORG_NAME: 'Cherry',
    APPLE_WALLET_PASS_DESCRIPTION: 'Cherry Spending Copilot Pass',
    APPLE_WALLET_CERT_PASSWORD: 'password',
    APPLE_WALLET_CERT_PATH: './certs/pass-cert.p12',
    APPLE_WALLET_WWDR_CERT_PATH: './certs/apple-wwdr.pem',
  },
  () => {
    const status = getWalletPassConfigStatus();
    if (!status.ok) throw new Error(`expected ok, got ${status.reason}`);
  }
);

console.log('wallet-pass-config: ok');
