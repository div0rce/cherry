import { register } from 'node:module';

register('./prisma-mock.loader.mjs', import.meta.url);
import '../prisma-mock.mjs';
