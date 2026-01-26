import * as assert from 'node:assert/strict';
import * as Module from 'node:module';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const requireModule = Module.createRequire(__filename);

function getPrismaUser() {
  const prismaMod: unknown = requireModule('../../lib/prisma.ts');
  const prismaMaybe = (prismaMod as { prisma?: unknown }).prisma;
  const hasPrisma = typeof prismaMaybe === 'object' && prismaMaybe !== null;
  assert.equal(hasPrisma, true);
  const user = (prismaMaybe as { user?: unknown }).user;
  const hasUser = typeof user === 'object' && user !== null;
  assert.equal(hasUser, true);
  const deleteMany = (user as { deleteMany?: unknown }).deleteMany;
  const findUnique = (user as { findUnique?: unknown }).findUnique;
  assert.equal(typeof deleteMany, 'function');
  assert.equal(typeof findUnique, 'function');
  return { deleteMany: deleteMany as (args: unknown) => Promise<unknown>, findUnique: findUnique as (args: unknown) => Promise<unknown> };
}

function getResolveUserContext() {
  const mod: unknown = requireModule('../../lib/user-context');
  const resolver = (mod as { resolveUserContext?: unknown }).resolveUserContext;
  assert.equal(typeof resolver, 'function');
  return resolver as (opts: unknown) => Promise<{ userId: string; email: string | null }>;
}

async function testEnsuresUserRowExists() {
  const prismaUser = getPrismaUser();
  const resolveUserContext = getResolveUserContext();

  const tempId = 'user-ensure-row-fixed';
  const tempEmail = `${tempId}@example.com`;
  await prismaUser.deleteMany({ where: { OR: [{ id: tempId }, { email: tempEmail }] } });

  const ctx = await resolveUserContext({
    requireAuth: true,
    allowLabDemo: true,
    sessionOverride: { user: { id: tempId, email: tempEmail } },
    getSession: async () => ({ user: { id: tempId, email: tempEmail } }),
  });

  assert.equal(ctx.userId, tempId);
  const user = (await prismaUser.findUnique({ where: { id: tempId } })) as { id: string; email: string | null } | null;
  assert.ok(user);
  assert.equal(user?.email, tempEmail);
}

async function run() {
  await testEnsuresUserRowExists();
  console.warn('user-context-ensure-row: ok');
}

run().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
