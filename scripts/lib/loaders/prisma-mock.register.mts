import { register } from 'node:module';

register('./prisma-mock.loader.mts', import.meta.url);
import '../prisma-mock.mts';
