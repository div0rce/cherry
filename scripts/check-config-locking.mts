import { createRequire } from 'node:module';

const requireFn = createRequire(import.meta.url);
requireFn('ts-node/register/transpile-only');

const { assertServerConfig } = requireFn('../lib/config/server.ts') as typeof import('../lib/config/server.ts');
const { getServerConfig, isServerConfigLocked, lockServerConfig, setServerConfig } = requireFn(
  '../lib/config/store.ts'
) as typeof import('../lib/config/store.ts');

function expectThrow(fn: () => void, message: string): void {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error(message);
  }
}

const baseConfig = assertServerConfig({
  appBaseUrl: 'http://localhost:3000',
  databaseUrl: 'file:./tmp/test.db',
  environment: 'test',
  enableDevTools: true,
  engineVersion: 'engine-test',
  wallet: { enabled: false },
  vineSignatureMode: 'off',
  offlineEvaluatorEnabled: true,
  bankIngest: {},
});

// Allow overwrite in case another loader ran before this script; explicit lock comes after.
setServerConfig(baseConfig, { allowOverwrite: true, lock: false });
lockServerConfig();

if (!isServerConfigLocked()) {
  throw new Error('Server config should be locked after lockServerConfig()');
}

expectThrow(
  () => setServerConfig({ ...baseConfig, engineVersion: 'mutated' }),
  'Server config reset should be rejected after lock'
);

const config = getServerConfig();
let mutationThrew = false;
try {
  (config as Record<string, unknown>)['environment'] = 'production';
} catch {
  mutationThrew = true;
}

const mutatedEnvironment = (config as Record<string, unknown>)['environment'];
if (!mutationThrew && mutatedEnvironment !== 'test') {
  throw new Error('Server config mutation should be prevented after lock');
}

let nestedMutationThrew = false;
try {
  (config.wallet as Record<string, unknown>)['enabled'] = true;
} catch {
  nestedMutationThrew = true;
}

const mutatedWalletEnabled = (config.wallet as Record<string, unknown>)['enabled'];
if (!nestedMutationThrew && mutatedWalletEnabled !== baseConfig.wallet.enabled) {
  throw new Error('Nested server config mutation should be prevented after lock');
}

process.stdout.write('check-config-locking: ok\n');
