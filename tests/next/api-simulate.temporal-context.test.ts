import { createRequire } from 'node:module';

const requireJs = createRequire(import.meta.url);
requireJs('./api-simulate.temporal-context.impl.js');
