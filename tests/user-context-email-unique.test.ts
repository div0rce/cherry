import assert from 'node:assert/strict';
import Module from 'node:module';

const requireModule = Module.createRequire(__filename);

function getPrismaUser() {
  const prismaMod: unknown = requireModule('../lib/prisma.ts');
  const prismaMaybe = (prismaMod as { prisma?: unknown }).prisma;
  assert.ok(prismaMaybe !== null && typeof prismaMaybe === 'object');
  const user = (prismaMaybe as { user?: unknown }).user;
  assert.ok(user !== null && typeof user === 'object');
  const deleteMany = (user as { deleteMany?: unknown }).deleteMany;
  const create = (user as { create?: unknown }).create;
  const findUnique = (user as { findUnique?: unknown }).findUnique;
  assert.equal(typeof deleteMany, 'function');
  assert.equal(typeof create, 'function');
  assert.equal(typeof findUnique, 'function');
  return {
    deleteMany: deleteMany as (args: unknown) => Promise<unknown>,
    create: create as (args: unknown) => Promise<unknown>,
    findUnique: findUnique as (args: unknown) => Promise<unknown>,
  };
}

function getResolveUserContext() {
  const mod: unknown = requireModule('../lib/user-context');
  const resolver = (mod as { resolveUserContext?: unknown }).resolveUserContext;
  assert.equal(typeof resolver, 'function');
  return resolver as (opts: unknown) => Promise<{ userId: string; email: string | null }>;
}

function getFallbackEmail() {
  const mod: unknown = requireModule('../lib/user-context');
  const fallback = (mod as { fallbackEmail?: unknown }).fallbackEmail;
  assert.equal(typeof fallback, 'function');
  return fallback as (userId: string) => string;
}

function getFallbackEmailV2() {
  const mod: unknown = requireModule('../lib/user-context');
  const fallback = (mod as { fallbackEmailV2?: unknown }).fallbackEmailV2;
  assert.equal(typeof fallback, 'function');
  return fallback as (userId: string) => string;
}

async function testEmailCollisionFallsBack() {
  const prismaUser = getPrismaUser();
  const resolveUserContext = getResolveUserContext();
  const fallbackEmail = getFallbackEmail();

  const sharedEmail = 'dup-fixed@example.com';
  const userA = 'user-a-fixed';
  const userB = 'user-b-fixed';

  await prismaUser.deleteMany({ where: { OR: [{ id: userA }, { id: userB }, { email: sharedEmail }] } });
  await prismaUser.create({ data: { id: userA, email: sharedEmail } });

  await resolveUserContext({
    requireAuth: true,
    allowLabDemo: true,
    sessionOverride: { user: { id: userB, email: sharedEmail } },
    getSession: async () => ({ user: { id: userB, email: sharedEmail } }),
  });

  const createdB = (await prismaUser.findUnique({ where: { id: userB } })) as { id: string; email: string | null } | null;
  assert.ok(createdB);
  assert.notEqual(createdB?.email, sharedEmail);
  assert.equal(createdB?.email, fallbackEmail(userB));
}

async function testFallbackCollisionUsesV2() {
  const prismaUser = getPrismaUser();
  const resolveUserContext = getResolveUserContext();
  const fallbackEmail = getFallbackEmail();
  const fallbackEmailV2 = getFallbackEmailV2();

  const userA = 'user-a-fallback-fixed';
  const userB = 'user-b-fallback-fixed';
  const fallbackForB = fallbackEmail(userB);
  const fallbackForB2 = fallbackEmailV2(userB);

  await prismaUser.deleteMany({
    where: { OR: [{ id: userA }, { id: userB }, { email: fallbackForB }, { email: fallbackForB2 }] },
  });
  await prismaUser.create({ data: { id: userA, email: fallbackForB } });

  await resolveUserContext({
    requireAuth: true,
    allowLabDemo: true,
    sessionOverride: { user: { id: userB, email: null } },
    getSession: async () => ({ user: { id: userB, email: null } }),
  });

  const createdB = (await prismaUser.findUnique({ where: { id: userB } })) as { id: string; email: string | null } | null;
  assert.ok(createdB);
  assert.equal(createdB?.email, fallbackEmailV2(userB));
}

async function run() {
  await testEmailCollisionFallsBack();
  await testFallbackCollisionUsesV2();
  console.warn('user-context-email-unique: ok');
}

run().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
