import { prisma } from '@/lib/prisma';
import type { World } from '../world';
import { SystemClock } from './clock.system';
import { ServerConfigReader } from './config.env';
import { NodeEntropy } from './entropy.node';
import { ConsoleLogger } from './logger.console';
import { buildPrismaStores } from './persistence.prisma';

export function buildPrismaWorld(): World {
  return {
    clock: SystemClock,
    entropy: NodeEntropy,
    logger: ConsoleLogger,
    config: ServerConfigReader,
    stores: buildPrismaStores(prisma),
  };
}
