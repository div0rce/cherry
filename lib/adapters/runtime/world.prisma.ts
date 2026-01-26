import { prisma } from '../../prisma.js';
import type { World } from '../world';
import { SystemClock } from './clock.system.js';
import { ServerConfigReader } from './config.env.js';
import { Sha256Digest } from './digest.sha256.js';
import { NodeEntropy } from './entropy.node.js';
import { ConsoleLogger } from './logger.console.js';
import { buildPrismaStores } from './persistence.prisma.js';

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
