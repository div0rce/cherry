import { createRequire } from 'node:module';

const requireJs = createRequire(import.meta.url);
requireJs('./runtime-scheduled-paydowns-availability.impl.js');
