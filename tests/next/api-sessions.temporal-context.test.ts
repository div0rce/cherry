import { createRequire } from 'node:module';

const requireJs = createRequire(import.meta.url);
requireJs('./api-sessions.temporal-context.impl.js');
