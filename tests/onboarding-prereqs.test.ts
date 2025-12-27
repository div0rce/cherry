import assert from 'node:assert/strict';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const requireModule = Module.createRequire(__filename);

type Scenario = {
  cardsCount: number;
  rulesCount: number;
  bucketsCount: number;
  baseRuleCount: number;
  cards: Array<{
    id: string;
    nickname: string;
    issuer: string;
    network: string;
    _count: { rewardRules: number };
  }>;
  buckets: Array<{
    id: string;
    name: string;
    category: string;
    budgetAmount: number;
    period: string;
  }>;
};

const scenario: Scenario = {
  cardsCount: 0,
  rulesCount: 0,
  bucketsCount: 0,
  baseRuleCount: 0,
  cards: [],
  buckets: [],
};

function mockPrisma(): void {
  const prismaMock = {
    prisma: {
      card: {
        count: async () => scenario.cardsCount,
        findMany: async () => scenario.cards,
      },
      rewardRule: {
        count: async (args: unknown) => {
          const where =
            typeof args === 'object' && args !== null && 'where' in (args as Record<string, unknown>)
              ? (args as Record<string, unknown>)['where']
              : undefined;
          const category =
            typeof where === 'object' && where !== null && 'category' in (where as Record<string, unknown>)
              ? (where as Record<string, unknown>)['category']
              : undefined;
          const hasCategory =
            typeof category === 'string' && category.length > 0;
          if (hasCategory) {
            return scenario.baseRuleCount;
          }
          return scenario.rulesCount;
        },
      },
      bucket: {
        count: async () => scenario.bucketsCount,
        findMany: async () => scenario.buckets,
      },
    },
  };

  const resolved = requireModule.resolve('@/lib/prisma');
  requireModule.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: prismaMock,
  } as NodeModule;
}

mockPrisma();

const { getAutopilotPrereqs } = requireModule(
  '../lib/adapters/runtime/autopilot-prereqs.js'
) as typeof import('../lib/adapters/runtime/autopilot-prereqs');
const { getFirstMissingPrereq } = requireModule(
  '../lib/autopilot/prereq-types.js'
) as typeof import('../lib/autopilot/prereq-types');

async function testEmptyState(): Promise<void> {
  scenario.cardsCount = 0;
  scenario.rulesCount = 0;
  scenario.bucketsCount = 0;
  scenario.baseRuleCount = 0;
  scenario.cards = [];
  scenario.buckets = [];

  const prereqs = await getAutopilotPrereqs('user-empty');
  assert.equal(prereqs.state, 'EMPTY');
  assert.equal(getFirstMissingPrereq(prereqs), 'cards');
}

async function testNeedsRules(): Promise<void> {
  scenario.cardsCount = 1;
  scenario.rulesCount = 0;
  scenario.bucketsCount = 2;
  scenario.baseRuleCount = 0;
  scenario.cards = [
    { id: 'card-1', nickname: 'Test Card', issuer: 'Issuer', network: 'VISA', _count: { rewardRules: 0 } },
  ];
  scenario.buckets = [
    { id: 'bucket-1', name: 'Dining', category: 'DINING', budgetAmount: 10000, period: 'MONTHLY' },
    { id: 'bucket-2', name: 'Groceries', category: 'GROCERIES', budgetAmount: 20000, period: 'MONTHLY' },
  ];

  const prereqs = await getAutopilotPrereqs('user-rules');
  assert.equal(prereqs.state, 'NEED_RULES');
  assert.equal(getFirstMissingPrereq(prereqs), 'rules');
}

async function testNeedsBuckets(): Promise<void> {
  scenario.cardsCount = 2;
  scenario.rulesCount = 3;
  scenario.bucketsCount = 0;
  scenario.baseRuleCount = 1;
  scenario.cards = [
    { id: 'card-1', nickname: 'Card A', issuer: 'Issuer', network: 'AMEX', _count: { rewardRules: 2 } },
    { id: 'card-2', nickname: 'Card B', issuer: 'Issuer', network: 'VISA', _count: { rewardRules: 1 } },
  ];
  scenario.buckets = [];

  const prereqs = await getAutopilotPrereqs('user-buckets');
  assert.equal(prereqs.state, 'NEED_BUCKETS');
  assert.equal(getFirstMissingPrereq(prereqs), 'buckets');
}

async function testReadyWithWarnings(): Promise<void> {
  scenario.cardsCount = 1;
  scenario.rulesCount = 2;
  scenario.bucketsCount = 1;
  scenario.baseRuleCount = 0;
  scenario.cards = [
    { id: 'card-1', nickname: 'Solo Card', issuer: 'Issuer', network: 'MASTERCARD', _count: { rewardRules: 2 } },
  ];
  scenario.buckets = [
    { id: 'bucket-1', name: 'Essentials', category: 'OTHER', budgetAmount: 50000, period: 'MONTHLY' },
  ];

  const prereqs = await getAutopilotPrereqs('user-ready');
  assert.equal(prereqs.state, 'READY');
  assert.equal(getFirstMissingPrereq(prereqs), null);
  assert.ok(prereqs.warnings.some((warning: string) => warning.includes('Only one card')));
  assert.ok(prereqs.warnings.some((warning: string) => warning.includes('No base reward rule')));
}

async function run(): Promise<void> {
  await testEmptyState();
  await testNeedsRules();
  await testNeedsBuckets();
  await testReadyWithWarnings();
  console.warn('onboarding-prereqs: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
