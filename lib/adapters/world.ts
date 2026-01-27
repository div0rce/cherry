import type { Clock } from './clock.js';
import type { ConfigReader } from './config.js';
import type { Digest } from './digest.js';
import type { EntropySource } from './entropy.js';
import type { HttpClient } from './http.js';
import type { Logger } from './logger.js';
import type {
  BankTxnStore,
  IdempotencyStore,
  LedgerStore,
  SessionStore,
} from './persistence.js';

export type World = {
  clock: Clock;
  logger: Logger;
  entropy: EntropySource;
  digest: Digest;
  config: ConfigReader;
  stores: {
    sessions: SessionStore;
    ledger: LedgerStore;
    bank: BankTxnStore;
    idempotency: IdempotencyStore;
  };
  http?: HttpClient;
};
