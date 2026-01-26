import { renderDeterministicGreeting } from '../lib/server-determinism-fixture.js';

const fixedNow = new Date('2024-01-01T00:00:00Z');

const first = renderDeterministicGreeting('Cherry', fixedNow);
const second = renderDeterministicGreeting('Cherry', fixedNow);

if (JSON.stringify(first) !== JSON.stringify(second)) {
  throw new Error('Deterministic server helper produced different outputs for identical inputs');
}

process.stdout.write('server-entropy-deterministic: ok\n');
