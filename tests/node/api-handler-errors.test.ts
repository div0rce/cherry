import * as assert from 'node:assert/strict';
import { apiHandler } from '../../lib/api/handler.js';
import { AppError } from '../../lib/errors.js';

// apiHandler keeps 4xx messages but never echoes internal error text (e.g. a Prisma error with
// the database host) in a 5xx response.

const internal = await apiHandler(async () => {
  throw new Error("Can't reach database server at `db.internal:5432`");
});
assert.equal(internal.status, 500);
assert.deepEqual(await internal.json(), { error: 'INTERNAL', message: 'Internal error' });

const notFound = await apiHandler(async () => {
  throw new AppError('NOT_FOUND', 'Card not found', 404);
});
assert.equal(notFound.status, 404);
assert.deepEqual(await notFound.json(), { error: 'NOT_FOUND', message: 'Card not found' });

assert.deepEqual(await (await apiHandler(async () => ({ ok: true }))).json(), { ok: true });

process.stdout.write('api-handler-errors: ok\n');
