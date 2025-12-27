import { prisma } from '../../prisma';
import type { World } from '../world';
import { SystemClock } from './clock.system';
import { ServerConfigReader } from './config.env';
import { Sha256Digest } from './digest.sha256';
import { NodeEntropy } from './entropy.node';
import { ConsoleLogger } from './logger.console';
import { buildPrismaStores } from './persistence.prisma';

export function buildPrismaWorld(): World {
  return {
    clock: SystemClock,
    entropy: NodeEntropy,
    digest: Sha256Digest,
    logger: ConsoleLogger,
    config: ServerConfigReader,
    stores: buildPrismaStores(prisma),
  };
}
