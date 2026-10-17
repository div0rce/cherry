import * as assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import * as path from 'node:path';

// Next compiles lib/config/store.ts into each bundle layer as a separate module copy. Config set
// through one copy (instrumentation.ts) must be visible through every other copy (route
// handlers, server components), otherwise getServerConfig() throws in production.

type Store = typeof import('../../lib/config/store.js');

const storeUrl = pathToFileURL(path.resolve('lib/config/store.ts')).href;
const copyA = (await import(`${storeUrl}?copy=a`)) as Store;
const copyB = (await import(`${storeUrl}?copy=b`)) as Store;
assert.notEqual(copyA, copyB, 'expected two distinct module instances');

const base = copyA.getServerConfig();
copyA.resetServerConfigForTests({ ...base, engineVersion: 'process-wide-check' });
assert.equal(copyB.hasServerConfig(), true);
assert.equal(copyB.getServerConfig().engineVersion, 'process-wide-check');
copyA.resetServerConfigForTests(base);

process.stdout.write('config-store-process-wide: ok\n');
