import type { Clock } from './clock';
import type { ConfigReader } from './config';
import type { Digest } from './digest';
import type { EntropySource } from './entropy';
import type { HttpClient } from './http';
import type { Logger } from './logger';
import type {
  BankTxnStore,
  IdempotencyStore,
  LedgerStore,
  SessionStore,
} from './persistence';

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
