import { assertServerConfig } from '../lib/config/server.js';
import {
  getServerConfig,
  isServerConfigLocked,
  lockServerConfig,
  setServerConfig,
} from '../lib/config/store.js';
import type { ServerConfig } from '../lib/config/server.js';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check-config-lock';
const FIX = 'Restore config lock invariants in lib/config/store.ts.';

function expectThrow(fn: () => void, message: string): void {
  let threw = false;
  try {
    fn();
  } catch (error: unknown) {
    void asMessage(error);
    threw = true;
  }
  if (!threw) {
    fail(PREFIX, message, { fix: FIX });
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
  fail(PREFIX, 'Server config should be locked after lockServerConfig()', { fix: FIX });
}

expectThrow(
  () => {
    void setServerConfig({ ...baseConfig, engineVersion: 'mutated' });
  },
  'Server config reset should be rejected after lock'
);

const config = getServerConfig() as ServerConfig;
let mutationThrew = false;
try {
  (config as Record<string, unknown>)['environment'] = 'production';
} catch (error: unknown) {
  void asMessage(error);
  mutationThrew = true;
}

const mutatedEnvironment = (config as Record<string, unknown>)['environment'];
if (!mutationThrew && mutatedEnvironment !== 'test') {
  fail(PREFIX, 'Server config mutation should be prevented after lock', { fix: FIX });
}

let nestedMutationThrew = false;
try {
  (config.wallet as Record<string, unknown>)['enabled'] = true;
} catch (error: unknown) {
  void asMessage(error);
  nestedMutationThrew = true;
}

const mutatedWalletEnabled = (config.wallet as Record<string, unknown>)['enabled'];
if (!nestedMutationThrew && mutatedWalletEnabled !== baseConfig.wallet.enabled) {
  fail(PREFIX, 'Nested server config mutation should be prevented after lock', { fix: FIX });
}

process.stdout.write('check-config-lock: ok\n');
