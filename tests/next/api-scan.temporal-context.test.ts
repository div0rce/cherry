import { createRequire } from 'node:module';

const requireJs = createRequire(import.meta.url);
requireJs('./api-scan.temporal-context.impl.js');
